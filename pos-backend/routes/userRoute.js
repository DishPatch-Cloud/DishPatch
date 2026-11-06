const express = require("express");
const { register, login, getUserData, logout, listStaff, changeRole } = require("../controllers/userController");
const { isVerifiedUser } = require("../middlewares/tokenVerification");
const { requireRole } = require("../middlewares/roles");
const router = express.Router();


// Authentication Routes
router.route("/register").post(register);
router.route("/login").post(login);
router.route("/logout").post(isVerifiedUser, logout)

router.route("/").get(isVerifiedUser , getUserData);

// Staff roles (owner only)
router.route("/staff").get(isVerifiedUser, requireRole("owner"), listStaff);
router.route("/staff/:userId/role").put(isVerifiedUser, requireRole("owner"), changeRole);

module.exports = router;
