const createHttpError = require("http-errors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const getJwtSecret = require("../config/jwtSecret");
const getCookieOptions = require("../utils/cookieOptions");
const {
  createUser,
  getUserByEmail,
  getUserById,
  verifyPassword,
  hasAnyUser,
  listUsers,
  setUserRole,
} = require("../models/userModel");
const { ROLES, roleOf } = require("../middlewares/roles");

// 🔹 Register new user
const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return next(createHttpError(400, "All fields are required!"));
    }

    const isUserPresent = await getUserByEmail(email);
    if (isUserPresent) {
      return next(createHttpError(400, "User already exists!"));
    }

    // One stack is one location. The first user of the stack owns it; later users start as staff.
    const role = (await hasAnyUser()) ? "staff" : "owner";
    const newUser = await createUser({ name, email, password, role });

    res.status(201).json({
      success: true,
      message: "New user created!",
      data: newUser,
    });
  } catch (error) {
    next(error);
  }
};

// 🔹 Login user
const login = async (req, res, next) => {
  try {
    console.log("Cookie options in login:", getCookieOptions());
    const { email, password } = req.body;

    if (!email || !password) {
      return next(createHttpError(400, "All fields are required!"));
    }

    const user = await getUserByEmail(email);
    if (!user) {
      return next(createHttpError(401, "Invalid Username"));
    }

    const isMatch = await verifyPassword(password, user.password);
    if (!isMatch) {
      return next(createHttpError(401, "Wrong Password"));
    }

    const secret = await getJwtSecret();
    const accessToken = jwt.sign({ userId: user.userId }, secret, {
      expiresIn: "1d",
    });

    // ✅ Use helper for cookie options
    res.cookie("accessToken", accessToken, getCookieOptions());

    res.status(200).json({
      success: true,
      message: "User login successfully!",
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

// 🔹 Get logged-in user data
const getUserData = async (req, res, next) => {
  try {
    const user = await getUserById(req.user.userId);
    if (!user) {
      return next(createHttpError(404, "User not found!"));
    }

    res.status(200).json({ success: true, data: user });
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

// 🔹 Logout user
const logout = async (req, res, next) => {
  try {
    // ✅ Clear cookie with same options (important for SameSite/secure)
    res.clearCookie("accessToken", getCookieOptions());
    res
      .status(200)
      .json({ success: true, message: "User logout successfully!" });
  } catch (error) {
    next(error);
  }
};

module.exports = { register, login, getUserData, logout, listStaff, changeRole };