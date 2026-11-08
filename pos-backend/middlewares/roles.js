const createHttpError = require("http-errors");

const ROLES = ["admin", "staff", "customer"];

// Older stacks stored owner and manager. Those stay admin. A profile with no role
// is an old test record, not an admin.
function roleOf(user) {
  const role = user?.role;
  if (role === "admin" || role === "staff" || role === "customer") return role;
  if (role === "owner" || role === "manager") return "admin";
  return "customer";
}

function stackHasAdmin(users) {
  return users.some((user) => roleOf(user) === "admin");
}

function requireRole(...allowed) {
  return (req, res, next) => {
    if (!allowed.includes(roleOf(req.user))) {
      return next(createHttpError(403, "Your role cannot do this."));
    }
    next();
  };
}

module.exports = { ROLES, roleOf, stackHasAdmin, requireRole };
