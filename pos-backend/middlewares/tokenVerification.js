const createHttpError = require("http-errors");
const { auth0Config } = require("../config/auth0");
const { verifyAuth0Session } = require("../auth/verifyAuth0");
const { ensureAuth0User } = require("../models/userModel");

function bearerToken(header) {
  if (typeof header !== "string") return "";
  const match = header.match(/^Bearer\s+(\S+)$/i);
  return match ? match[1] : "";
}

function withoutSecret(user) {
  const { password, ...safe } = user;
  return safe;
}

const isVerifiedUser = async (req, res, next) => {
  try {
    const auth0 = auth0Config();
    if (!auth0) {
      return next(createHttpError(503, "Auth0 is not configured for this POS."));
    }

    const accessToken = bearerToken(req.headers.authorization);
    if (!accessToken) {
      return next(createHttpError(401, "Please provide token!"));
    }

    const idToken = req.headers["x-auth0-id-token"];
    let identity;
    try {
      identity = await verifyAuth0Session(accessToken, typeof idToken === "string" ? idToken : "", auth0);
    } catch (error) {
      return next(createHttpError(401, "Invalid Token!"));
    }

    let user;
    try {
      user = await ensureAuth0User({
        subject: identity.subject,
        email: identity.email,
        name: identity.name,
        emailVerified: identity.emailVerified,
      });
    } catch (error) {
      if (error.statusCode) return next(createHttpError(error.statusCode, error.message));
      throw error;
    }

    req.user = withoutSecret(user);
    next();
  } catch (error) {
    return next(createHttpError(401, "Invalid Token!"));
  }
};

module.exports = { isVerifiedUser };
