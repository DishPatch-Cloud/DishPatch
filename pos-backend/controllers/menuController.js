const createHttpError = require("http-errors");
const { addDish, getAllMenuItems } = require("../models/menuModel");

// Validate a dish sent by the menu editor. Returns a message string when invalid.
function readDish(body) {
  const menuName = typeof body?.menuName === "string" ? body.menuName.trim() : "";
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const price = Number(body?.price);

  if (menuName.length < 1 || menuName.length > 40) return "Category must be 1 to 40 characters.";
  if (name.length < 1 || name.length > 80) return "Dish name must be 1 to 80 characters.";
  if (!Number.isFinite(price) || price < 0 || price > 10000) return "Price must be between 0 and 10000.";

  return { menuName, name, price };
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

module.exports = { addMenu, getMenus };
