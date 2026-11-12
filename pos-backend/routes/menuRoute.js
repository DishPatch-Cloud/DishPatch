const express = require("express");
const { addMenu, createMenuPhotoUpload, getMenus, saveMenuPhoto } = require("../controllers/menuController");
const { isVerifiedUser } = require("../middlewares/tokenVerification");
const { requireRole } = require("../middlewares/roles");
const router = express.Router();

router.get("/", isVerifiedUser, getMenus);
router.post("/", isVerifiedUser, requireRole("admin"), addMenu);
router.post("/:uuid/photo", isVerifiedUser, requireRole("admin"), createMenuPhotoUpload);
router.put("/:uuid/photo", isVerifiedUser, requireRole("admin"), saveMenuPhoto);

module.exports = router;
