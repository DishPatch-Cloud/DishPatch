const createHttpError = require("http-errors");

const ROLES = ["admin", "staff", "customer"];

// Older stacks stored owner, manager and staff. Owner and manager become admin.
// A profile with no role was created before roles existed and keeps full access.
function roleOf(user) {
  const role = user?.role;
  if (role === "admin" || role === "staff" || role === "customer") return role;
  if (role === "owner" || role === "manager" || !role) return "admin";
  return "customer";
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
