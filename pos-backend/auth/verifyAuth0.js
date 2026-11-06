const jwt = require("jsonwebtoken");
const jwksRsa = require("jwks-rsa");

const clients = new Map();

function signingKeys(domain) {
  const cached = clients.get(domain);
  if (cached) return cached;
  const created = jwksRsa({
    jwksUri: `https://${domain}/.well-known/jwks.json`,
    cache: true,
    rateLimit: true,
  });
  clients.set(domain, created);
  return created;
}

function verify(token, { domain, audience }) {
  return new Promise((resolve, reject) => {
    jwt.verify(
      token,
      (header, callback) => {
        if (header.alg !== "RS256") {
          callback(new Error("Auth0 token must be signed with RS256."));
          return;
        }
        signingKeys(domain).getSigningKey(header.kid, (error, key) => {
          if (error) {
            callback(error);
            return;
          }
          callback(null, key.getPublicKey());
        });
      },
      {
        algorithms: ["RS256"],
        audience,
        issuer: `https://${domain}/`,
      },
      (error, payload) => (error ? reject(error) : resolve(payload)),
    );
  });
}

// Access token authorises the API call. The ID token carries the email and name used to open a POS profile.
async function verifyAuth0Session(accessToken, idToken, auth0) {
  const access = await verify(accessToken, { domain: auth0.domain, audience: auth0.audience });
  if (typeof access.sub !== "string" || access.sub.length === 0) {
    throw new Error("Auth0 token has no subject.");
  }
  if (typeof access.azp === "string" && access.azp !== auth0.clientId) {
    throw new Error("Auth0 token was issued to a different application.");
  }

  let email = null;
  let name = null;
  let emailVerified = false;
  if (idToken) {
    const identity = await verify(idToken, { domain: auth0.domain, audience: auth0.clientId });
    if (identity.sub !== access.sub) {
      throw new Error("Auth0 ID token does not match the access token.");
    }
    email = typeof identity.email === "string" ? identity.email.trim().toLowerCase() : null;
    name = typeof identity.name === "string" ? identity.name.trim() : null;
    emailVerified = identity.email_verified === true;
  }

  return { subject: access.sub, email, name, emailVerified };
}

module.exports = { verifyAuth0Session };
