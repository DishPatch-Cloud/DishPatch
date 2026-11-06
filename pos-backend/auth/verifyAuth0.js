// jose is ESM-only. Load it with import() so the Lambda, which is CommonJS, can start.
let josePromise;
function loadJose() {
  if (!josePromise) josePromise = import("jose");
  return josePromise;
}

const keySets = new Map();

async function verify(token, { domain, audience }) {
  const { createRemoteJWKSet, decodeProtectedHeader, jwtVerify } = await loadJose();
  const header = decodeProtectedHeader(token);
  if (header.alg !== "RS256") {
    throw new Error("Auth0 token must be signed with RS256.");
  }

  let keys = keySets.get(domain);
  if (!keys) {
    keys = createRemoteJWKSet(new URL(`https://${domain}/.well-known/jwks.json`));
    keySets.set(domain, keys);
  }

  const { payload } = await jwtVerify(token, keys, {
    algorithms: ["RS256"],
    audience,
    issuer: `https://${domain}/`,
  });
  return payload;
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
