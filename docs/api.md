# API Reference

DishPatch has two HTTP backends and one WebSocket channel. This document covers all three:
every route, what it returns, and every status code it can produce.

| | Base URL | Runs on | Auth |
|:--|:--|:--|:--|
| [Control backend](#control-backend) | `https://controlapi.dish-patch.com` | Spring Boot on EC2, behind nginx | **None** — see [Authentication](#authentication) |
| [Control WebSocket](#websocket-stomp) | `https://controlapi.dish-patch.com/ws` | same process | None |
| [POS backend](#pos-backend) | `https://posapi.dish-patch.com` | Express on Lambda, behind API Gateway | Cookie JWT |

The two backends were written separately and do not share conventions: the control backend
uses plural paths (`/api/orders`), the POS backend singular ones (`/api/order`); one returns
`200` on create and the other `201`; their error bodies have different shapes. The
[comparison table](#the-two-backends-side-by-side) at the end sets them out together.

They share one thing that matters: the **DynamoDB Orders table**. The POS writes orders into
it, and the control backend reads and updates the same rows. There is no queue between them —
[architecture.md](./architecture.md#why-the-database-is-the-queue) explains why, and what the two
sides must agree on.

---

## Control backend

Locally the backend listens on `http://localhost:8080`; in Docker it runs on `8081`, and
production nginx proxies `controlapi.dish-patch.com` to that port.

CORS on `/api/**` allows `http://localhost:5173`, `http://127.0.0.1:5173` and
`https://control.dish-patch.com`, with credentials.

### Response shapes

**Only `/api/orders` and `/api/users` use the envelope:**

```json
{ "success": true, "message": null, "data": { } }
```

`message` is set on errors and on `PUT /api/orders/{id}`, and is `null` everywhere else; `data`
is `null` on errors. `/api/dispatch`, `/api/dynamodb/health` and `/api/nav/*` return their
objects unwrapped.

Errors therefore come in two shapes. Failures a handler anticipates use the envelope with
`success: false`. Failures Spring catches first — a missing or malformed body, a value that
will not deserialise, an unmapped path — use Spring Boot's default:

```json
{ "timestamp": "2026-10-05T03:12:45.123+00:00", "status": 400, "error": "Bad Request", "path": "/api/orders/a3f1" }
```

The orders and users routes do not handle a DynamoDB failure; it surfaces as Spring's default
`500`. The status tables below leave that out.

### Orders — `/api/orders`

An **order** is the DynamoDB item the POS wrote, with three aliases added for the frontend:

| Field | Source |
|:--|:--|
| `orderId`, `displayId`, `customerDetails`, `orderStatus`, `orderDate`, `bills`, `items`, `table`, `paymentMethod`, `paymentData` | As stored by the POS |
| `status` | Copy of `orderStatus`; `"Preparing"` if the row has none |
| `createdAt` | Copy of `orderDate` |
| `tableNo` | `table.tableNo` if `table` is an object, otherwise `table` itself |

`orderStatus` should be one of `Preparing`, `Completed`, `Cancelled` — the contract between the
two backends. Only this backend enforces it, though: the POS stores whatever string it is
given (see [known issues](#known-issues)), and such a row is returned here as stored.

#### `GET /api/orders`

Every order, newest first by `orderDate`. Reads the whole table with a paginated scan.

| Status | When |
|:--|:--|
| `200` | Envelope with an array of orders. |

#### `GET /api/orders/{id}`

| Status | When |
|:--|:--|
| `200` | Found. |
| `404` | No such order. `{"success": false, "message": "Order not found", "data": null}` |

#### `PUT /api/orders/{id}` — change status, including cancel

```json
{ "orderStatus": "Cancelled" }
```

`orderStatus` accepts `Preparing`, `Completed` or `Cancelled`, case-insensitively; the enum
names (`CANCELLED`) are accepted too.

**Only an order that is currently `Preparing` can be changed.** The write is a DynamoDB update
conditional on `orderStatus = "Preparing"`, so a completed or cancelled order cannot be moved
again — including back to `Preparing`.

**Cancelling is this request with `"Cancelled"`.** There is no separate route. When it succeeds
the controller also tells dispatch, which takes the robot off the delivery on its next tick if
the meal has not yet been handed over. Setting `"Completed"` does not notify dispatch. The
dispatch side is described in the
[dispatch README](../control-backend/src/main/java/com/dishpatch/dispatch/README.md#cancellation).

| Status | When |
|:--|:--|
| `200` | Updated. `message` is `"Order updated"`, `data` the order as it now stands. |
| `409` | The order exists but is not `Preparing`. `message` is `"Order {id} isn't preparing"`. |
| `404` | No such order. |
| `400` | `orderStatus` missing, `null`, blank or not one of the three — or the body is not JSON. Spring's default shape. |

### Users — `/api/users`

Operator accounts for the control dashboard. They live in their own table
(`CONTROL_BACKEND_USERS_TABLE`), separate from the POS's users. A **user** is
`userId`, `email`, `name`, `createdAt`, `updatedAt`, plus `phone` and `role` when set — signup
sets neither. The password hash is stripped from every response.

#### `GET /api/users/{id}`

| Status | When |
|:--|:--|
| `200` | Found. |
| `404` | `"User not found"`. |

#### `POST /api/users/login`

```json
{ "email": "operator@example.com", "password": "…" }
```

Returns the user on success **and nothing else** — no token, no cookie, no session. The
dashboard stores the returned `userId` in `localStorage`, and nothing on the server ever
checks it.

| Status | When |
|:--|:--|
| `200` | Email and password match. |
| `401` | `"Invalid email or password"` — unknown email and wrong password are not distinguished. |
| `400` | `"Email and password are required"`. |

#### `POST /api/users/signup`

```json
{ "fname": "Ada", "lname": "Lovelace", "email": "ada@example.com", "password": "…" }
```

The server generates `userId` and builds `name` from `fname` and `lname`. Email uniqueness is
checked in the service, against the table's `EmailIndex`, before the write.

| Status | When |
|:--|:--|
| `200` | Created. Not `201`. |
| `409` | `"Email already exists"`. |
| `400` | `"Invalid email: …"`, or a password that is missing. |

#### `PATCH /api/users/update/username/{id}` and `PATCH /api/users/update/password/{id}`

Both are mapped and reachable, and **neither works**. No client in the repository calls them.

- `update/username` updates the **email**, not a username. Given a valid email it always
  returns `409 "Email already exists"`, because its condition expression cannot be satisfied;
  an invalid one gets `400`. The reasoning is recorded in a FIXME on
  `UserRepository.updateEmail`.
- `update/password` takes one `password` field and uses it both to check the current password
  and to store the new one, so the only input that succeeds is the password already on the
  account. Returns `200` for that, `400 "Invalid password"` otherwise, `409 "Id fault"` for an
  unknown id. See the FIXME on `UserService.updatePassword`.

### Dispatch — `GET /api/dispatch`

Read-only state of the delivery pipeline: whether it is enabled, the rosbridge link, time
since the last tick, queued orders, free robots, every in-flight delivery and every order it
could not route. Always `200`, unwrapped.

The fields and how to read them are documented with an example in the
[dispatch README](../control-backend/src/main/java/com/dishpatch/dispatch/README.md#debug-endpoint).

### Health — `GET /api/dynamodb/health`

Calls `DescribeTable` on the Orders table.

| Status | Body |
|:--|:--|
| `200` | `{"connected": true, "table": "dishpatch-pos-backend-Orders", "status": "ACTIVE"}` |
| `500` | `{"connected": false, "table": "…", "error": "…"}` |

### Navigation test endpoint — `/api/nav` (disabled)

A bench tool from before dispatch existed: it publishes a navigation goal for any robot, with
no authentication. It is gated by `nav.test-endpoint.enabled`, which is `false`, so the
controller is never created and every route below returns Spring's `404`.

It was once left enabled in production, which is why `application.properties` warns against
it at length. Enable it only in a local `.env`, never on a reachable host.

| Route | Body | Returns |
|:--|:--|:--|
| `GET /api/nav/health` | — | `{"rosbridgeConnected", "robots", "destinationsLoaded"}` |
| `GET /api/nav/destinations` | — | `{"frameId", "count", "destinations": [{"id", "x", "y", "yaw"}]}` |
| `POST /api/nav/goTo` | `{"robotId": 1, "destination": "T6"}` | `200 {"sent": true, …}`; `404` unknown destination; `503` rosbridge down; `502` publish failed. Failures are `{"sent": false, "error": "…"}`. |

---

## WebSocket (STOMP)

The dashboard's live data arrives over STOMP on a SockJS endpoint.

| | |
|:--|:--|
| Endpoint | `/ws` (SockJS) |
| Broker prefix | `/topic` |
| Application prefix | `/app` |
| Allowed origins | `https://control.dish-patch.com`, `http://localhost:5173` |

The origin list is checked against the browser's `Origin` header. It keeps other websites out;
it does not keep out a client that is not a browser.

### Published by the server

| Destination | Payload | Every |
|:--|:--|:--|
| `/topic/robot-locations` | Array of robots: `id`, `name`, `x`, `y`, `yaw`, `status`, `battery`, `speed`, `destination`, `orderId`. Ordered by status. A robot silent for 20 seconds is left out. | 100 ms |
| `/topic/robot-stats` | `{"serving", "pickup", "returning", "waiting", "maintenance", "total", "timestamp"}` | 100 ms |
| `/topic/orders` | The same array `GET /api/orders` returns, **without** the envelope. | 4 s |

The two robot topics are sent on the same tick (`RobotService.BROADCAST_INTERVAL_MS`). They do
not count the same robots, though: `robot-stats` includes robots that have gone silent, so its
`total` can exceed the length of `robot-locations`.

Positions are metres in the ROS map frame. `status` is one of `Serving`, `Returning`,
`Waiting`, `Pickup`, `Maintenance`; dispatch only ever produces the first three.

### Accepted from clients

| Destination | Payload | Notes |
|:--|:--|:--|
| `/app/robot-data` | Array of robots, same fields as above | Marked temporary in the code. Upserts each robot's position, heading, battery, speed **and status**, copied verbatim. Its one sender in the repository is the bench simulator `control-backend/virtual-robots/virtual-robots.py`. The deployed fleet does not use it — real telemetry arrives from rosbridge. |

---

## POS backend

Express, packaged as a Lambda container image, fronted by an API Gateway HTTP API. A leading
`/prod`, `/dev` or `/staging` stage prefix is stripped from the path before routing, so both
`/prod/api/order` and `/api/order` reach the same handler.

CORS allows credentials. The allowed origin is `http://localhost:5173` unless `NODE_ENV` is
`lambda` — which the deployed function sets — in which case it comes from
`CORS_ALLOW_ORIGINS`, deployed as `https://pos.dish-patch.com`.

### Auth0 session

The POS does not issue its own passwords or session cookies. The browser signs in with the
DishPatch POS Auth0 application and sends that application's access token as
`Authorization: Bearer`. It also sends the ID token in `x-auth0-id-token` so the API can read
the email and name. The API checks the token signature against the tenant JWKS, and requires
the issuer `https://dish-patch.au.auth0.com/`, the audience `https://pos.dish-patch`, and the
POS application client id.

The first accepted sign-in on a stack becomes `admin`. Later sign-ins start as `customer`. Email
verification is not required. If a verified email already has a POS profile from before Auth0,
that profile keeps its `userId`, role and data, and is linked to the Auth0 subject. An
unverified sign-in opens its own profile and does not take over an existing one. A missing or
invalid token returns `401`. A stack with no Auth0 settings returns `503`.

### Response shapes

Success bodies carry `success` and `data`, plus `message` on writes. Errors are different:

```json
{ "status": 404, "message": "Order not found!" }
```

with an `errorStack` field added when `NODE_ENV` is unset or `development` — so in a typical
local run, but not in the deployed function.

### Routes

| Method and path | Auth | Body | Success | Errors |
|:--|:--:|:--|:--|:--|
| `GET /` | | | `200 {"message": "Hello from POS Server!"}` | |
| `GET /api/user` | ✓ | | `200`, the logged-in user, without a password | `404` |
| `POST /api/order` | ✓ | see below | `201`, the order | |
| `GET /api/order` | ✓ | | `200`, orders this role may see, plus `tableNo` | |
| `GET /api/order/:id` | ✓ | | `200` | `404 "Order not found!"` when missing or hidden from this role |
| `PUT /api/order/:id` | ✓ | `orderStatus` | `200`, the updated row | `404` when hidden from this role; see [known issues](#known-issues) |
| `POST /api/table` | ✓ | `tableNo`, `seats` | `201` | `400` no `tableNo`, or table exists |
| `GET /api/table` | ✓ | | `200` | |
| `PUT /api/table/:id` | ✓ | `status`, `seats`, `customerName`, `customerPhone`, `guests` — all optional | `200` | see [known issues](#known-issues) |
| `GET /api/menu` | ✓ | | `200`, menus with their items | |
| `POST /api/menu` | ✓ admin | `menuName` (category, 1–40 chars), `name` (dish, 1–80 chars), `price` (0–10000) | `201`, the new dish in `data` | `400` invalid field; `403` for staff or customer |
| `GET /api/user/staff` | ✓ admin or staff | | `200`, every user in this stack with `role` | `403` for a customer |
| `POST /api/user/claim-admin` | ✓ | | `200`, this account is now `admin` | `409` when any account is already admin (`owner`, `manager`, a blank role, or `admin`) |
| `PUT /api/user/staff/:userId/role` | ✓ admin | `role`: `admin`, `staff` or `customer` | `200` | `400` invalid role or removing your own admin role; `404`; `403` |
| `POST /api/payment` | ✓ | `orderIds[]`, `transactionType`, `amount` | **never responds** | `400` invalid input |

### Creating an order

```json
{
  "customerDetails": { "name": "Ada", "phone": "0400000000", "guests": 2 },
  "bills": { "total": 40, "tax": 4, "totalWithTax": 44 },
  "items": [ ],
  "table": "T6",
  "paymentMethod": "Cash"
}
```

Nothing in the body is validated. The server adds `orderId`, a four-digit `displayId`,
`orderDate`, and `orderedBy` from the signed-in account (`userId`, `name`, `email`). An
`orderedBy` field in the request is ignored. `orderStatus` defaults to `"Preparing"`; a string
`table` is stored as `{"tableNo": "T6"}`.

`admin` and `staff` receive every order. A `customer` receives only orders whose `orderedBy.userId`
is their own, including on `GET /api/order/:id` and `PUT /api/order/:id`. Orders placed before
`orderedBy` was stored stay visible to admin and staff, and hidden from customers.

**`table` decides whether a robot can deliver the order.** Dispatch uses the table number
directly as a drop-point id, and the map has `T1`–`T18` and `R1`–`R7`. An order for any other
table is accepted here and then skipped by dispatch, which reports it in
`GET /api/dispatch` → `skipped` with the reason `Unknown destination`.

---

## Authentication

### Control backend: none

The control backend has no authentication of any kind: no security filter, no token, no API
key, no session. `POST /api/users/login` checks a password and returns the user, and the
dashboard uses that to decide what to show, but no endpoint asks who is calling.

Everything is therefore available to anyone who can reach `controlapi.dish-patch.com`:

- every order, with customer details (`GET /api/orders`)
- completing or cancelling any `Preparing` order (`PUT /api/orders/{id}`)
- any operator's record, given its id (`GET /api/users/{id}`), and unlimited signups
- whether a guessed password is correct for a known user id — the broken
  `PATCH /api/users/update/password/{id}` answers `200` for the right password and `400` for a
  wrong one
- the dispatch pipeline's internal state, and the Orders table's name and status
- injecting fake robot telemetry, status included, through `/app/robot-data`

nginx terminates TLS and passes everything through; it adds no access control.

### POS backend: Auth0, with roles inside the stack

Every POS route requires an Auth0 access token for the POS application. Menu editing and
changing permissions are limited to `admin`. `staff` and `admin` can read the user list and
every order. A `customer` can place an order and can read only the orders they placed.

Roles belong to one stack, which is one location. The first Auth0 user to open the POS becomes
`admin`; later users start as `customer`. An existing `owner` or `manager`, and any profile
with no role, is treated as `admin`. An existing `staff` stays `staff`. Anyone who can sign up
in the POS Auth0 application joins as `customer` until an admin changes that. Turn off signups
in that Auth0 application to make it invite-only.

---

## Known issues

| Where | Issue |
|:--|:--|
| `POST /api/payment` | Never sends a response. The success path — sending to SQS and replying — is commented out, so a valid request runs off the end of the handler and hangs until the client or API Gateway times out. The POS frontend still calls it. |
| `PUT /api/order/:id`, `PUT /api/table/:id` | DynamoDB updates with no condition, which makes them upserts. An unknown id creates a new row instead of returning the documented `404`; that branch cannot run. The control backend guards the same operation on the same Orders table. |
| `PUT /api/order/:id` | `orderStatus` is stored as given — any string. The control backend accepts only the three contract values. |
| `PUT /api/table/:id` | Omitting `status` resets it to `"Available"`, so an update that only changes `guests` frees an occupied table. |
| `PATCH /api/users/update/*` | Broken, as described [above](#patch-apiusersupdateusernameid-and-patch-apiusersupdatepasswordid). |

---

## The two backends side by side

| | Control backend | POS backend |
|:--|:--|:--|
| Paths | plural — `/api/orders`, `/api/users` | singular — `/api/order`, `/api/user` |
| Create returns | `200` | `201` |
| Success body | `{success, message, data}` on orders and users only | `{success, data}`, plus `message` on writes |
| Error body | the envelope, or Spring's default | `{status, message}` |
| Authentication | none | Auth0 access token |
| `orderStatus` on update | the three contract values only | any string |
| Status transitions | only out of `Preparing` | any |
| Unknown id on update | `404` | creates a row |
| Password hash in responses | never | never |
