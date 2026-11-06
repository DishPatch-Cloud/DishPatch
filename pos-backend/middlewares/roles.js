const createHttpError = require("http-errors");

const ROLES = ["owner", "manager", "staff"];

// Users created before roles existed had full access. They keep it until an owner sets a role.
function roleOf(user) {
  return ROLES.includes(user?.role) ? user.role : "owner";
}

function requireRole(...allowed) {
  return (req, res, next) => {
    if (!allowed.includes(roleOf(req.user))) {
      return next(createHttpError(403, "Your role cannot do this."));
    }
    next();
  };
}

module.exports = { ROLES, roleOf, requireRole };
