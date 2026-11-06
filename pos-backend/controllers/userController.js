const createHttpError = require("http-errors");
const { getUserById, listUsers, setUserRole } = require("../models/userModel");
const { ROLES, roleOf } = require("../middlewares/roles");

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

    res.status(200).json({ success: true, data: withoutSecret(user) });
  } catch (error) {
    next(error);
  }
};

// 🔹 List staff in this stack (owner only)
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

// 🔹 Change a user's role (owner only)
const changeRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    const { userId } = req.params;

    if (!ROLES.includes(role)) {
      return next(createHttpError(400, "Role must be owner, manager or staff."));
    }
    // An owner cannot demote themselves, so the stack always keeps an owner.
    if (userId === req.user.userId && role !== "owner") {
      return next(createHttpError(400, "You cannot remove your own owner role."));
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

module.exports = { getUserData, listStaff, changeRole };
