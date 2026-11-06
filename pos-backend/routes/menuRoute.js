const express = require("express");
const { addMenu, getMenus } = require("../controllers/menuController");
const { isVerifiedUser } = require("../middlewares/tokenVerification");
const { requireRole } = require("../middlewares/roles");
const router = express.Router();

router.get("/", isVerifiedUser, getMenus);
router.post("/", isVerifiedUser, requireRole("owner", "manager"), addMenu);

module.exports = router;
