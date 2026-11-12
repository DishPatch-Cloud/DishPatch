const createHttpError = require("http-errors");
const { addDish, getAllMenuItems, setDishImage } = require("../models/menuModel");
const { PHOTO_TYPES, UUID, isPhotoUrl, presignPhotoUpload } = require("../models/menuPhoto");

// Validate a dish sent by the menu editor. Returns a message string when invalid.
function readDish(body) {
  const menuName = typeof body?.menuName === "string" ? body.menuName.trim() : "";
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const price = Number(body?.price);
  const description = typeof body?.description === "string" ? body.description.trim() : "";

  if (menuName.length < 1 || menuName.length > 40) return "Category must be 1 to 40 characters.";
  if (name.length < 1 || name.length > 80) return "Dish name must be 1 to 80 characters.";
  if (!Number.isFinite(price) || price < 0 || price > 10000) return "Price must be between 0 and 10000.";
  if (description.length > 400) return "Description must be 400 characters or fewer.";

  return { menuName, name, price, description };
}

// ➤ Add a dish to a category in the shared menu (admin)
const addMenu = async (req, res, next) => {
  try {
    const dish = readDish(req.body);
    if (typeof dish === "string") {
      return next(createHttpError(400, dish));
    }

    const saved = await addDish(dish);

    res.status(201).json({
      success: true,
      message: "Dish added.",
      data: saved,
    });
  } catch (error) {
    console.error("❌ [addMenu] Error:", error);
    next(error);
  }
};

// ➤ Get all menus
const getMenus = async (req, res, next) => {
  try {
    const menus = await getAllMenuItems();

    res.status(200).json({
      success: true,
      data: menus,
    });
  } catch (error) {
    console.error("[getMenus] Error fetching menus:", error);
    next(error);
  }
};

const createMenuPhotoUpload = async (req, res, next) => {
  try {
    const uuid = req.params.uuid;
    const contentType = typeof req.body?.contentType === "string" ? req.body.contentType : "";
    if (!UUID.test(uuid)) return next(createHttpError(400, "Dish id is invalid."));
    if (!PHOTO_TYPES[contentType]) return next(createHttpError(400, "Photo must be a JPEG, PNG, or WebP."));

    const signed = await presignPhotoUpload(uuid, contentType);
    if (!signed) return next(createHttpError(503, "Menu photo storage is not configured."));

    res.status(200).json({ success: true, ...signed });
  } catch (error) {
    next(error);
  }
};

const saveMenuPhoto = async (req, res, next) => {
  try {
    const uuid = req.params.uuid;
    const imageUrl = typeof req.body?.imageUrl === "string" ? req.body.imageUrl : "";
    if (!UUID.test(uuid)) return next(createHttpError(400, "Dish id is invalid."));
    if (!isPhotoUrl(uuid, imageUrl)) return next(createHttpError(400, "Photo address does not belong to this dish."));

    const dish = await setDishImage(uuid, imageUrl);
    if (!dish) return next(createHttpError(404, "Dish not found."));

    res.status(200).json({ success: true, message: "Photo saved.", data: dish });
  } catch (error) {
    next(error);
  }
};

module.exports = { addMenu, getMenus, createMenuPhotoUpload, saveMenuPhoto };
