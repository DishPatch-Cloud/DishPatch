const express = require("express");
const { getUserData, listStaff, changeRole } = require("../controllers/userController");
const { isVerifiedUser } = require("../middlewares/tokenVerification");
const { requireRole } = require("../middlewares/roles");
const router = express.Router();

router.route("/").get(isVerifiedUser, getUserData);

// Staff roles (owner only)
router.route("/staff").get(isVerifiedUser, requireRole("owner"), listStaff);
router.route("/staff/:userId/role").put(isVerifiedUser, requireRole("owner"), changeRole);

module.exports = router;
