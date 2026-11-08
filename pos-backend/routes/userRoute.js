const express = require("express");
const { getUserData, listStaff, changeRole } = require("../controllers/userController");
const { isVerifiedUser } = require("../middlewares/tokenVerification");
const { requireRole } = require("../middlewares/roles");
const router = express.Router();

router.route("/").get(isVerifiedUser, getUserData);

// User list is visible to staff and admin. Only an admin can change a permission.
router.route("/staff").get(isVerifiedUser, requireRole("admin", "staff"), listStaff);
router.route("/staff/:userId/role").put(isVerifiedUser, requireRole("admin"), changeRole);

module.exports = router;
