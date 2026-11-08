const createHttpError = require("http-errors");
const { getUserById, listUsers, setUserRole } = require("../models/userModel");
const { ROLES, roleOf, stackHasAdmin } = require("../middlewares/roles");

function withoutSecret(user) {
  const { password, ...safe } = user;
  return safe;
}

// 🔹 Get logged-in user data
const getUserData = async (req, res, next) => {
  try {
    const user = await getUserById(req.user.userId);
    if (!user) {
      return next(createHttpError(404, "User not found!"));
    }

    const safe = withoutSecret(user);
    safe.role = roleOf(user);
    res.status(200).json({ success: true, data: safe });
  } catch (error) {
    next(error);
  }
};

// 🔹 List users in this stack (staff and admin)
const listStaff = async (req, res, next) => {
  try {
    const users = await listUsers();
    res.status(200).json({
      success: true,
      data: users.map((user) => ({ ...user, role: roleOf(user) })),
    });
  } catch (error) {
    next(error);
  }
};

// 🔹 Change a user's permission (admin only)
const changeRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    const { userId } = req.params;

    if (!ROLES.includes(role)) {
      return next(createHttpError(400, "Role must be admin, staff or customer."));
    }
    // An admin cannot demote themselves, so the stack always keeps an admin.
    if (userId === req.user.userId && role !== "admin") {
      return next(createHttpError(400, "You cannot remove your own admin role."));
    }

    const updated = await setUserRole(userId, role);
    if (!updated) {
      return next(createHttpError(404, "User not found!"));
    }

    res.status(200).json({
      success: true,
      message: "Role updated.",
      data: { userId: updated.userId, role: updated.role },
    });
  } catch (error) {
    next(error);
  }
};

// The new admin role does not exist on older accounts. If nobody in this location
// is an admin, the signed-in account can take that role once.
const claimAdmin = async (req, res, next) => {
  try {
    const users = await listUsers();
    if (stackHasAdmin(users)) {
      return next(createHttpError(409, "This location already has an admin."));
    }

    const updated = await setUserRole(req.user.userId, "admin");
    if (!updated) {
      return next(createHttpError(404, "User not found!"));
    }

    res.status(200).json({
      success: true,
      message: "You are now the admin.",
      data: { userId: updated.userId, role: "admin" },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getUserData, listStaff, changeRole, claimAdmin };
