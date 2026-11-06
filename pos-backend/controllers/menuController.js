const createHttpError = require("http-errors");
const { accountIdOf } = require("../models/account");
const { addDish, getMenusForAccount } = require("../models/menuModel");

function readDish(body) {
  const menuName = typeof body?.menuName === "string" ? body.menuName.trim() : "";
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const price = Number(body?.price);
  if (menuName.length < 1 || menuName.length > 40) return "Category name must be 1 to 40 characters.";
  if (name.length < 1 || name.length > 80) return "Dish name must be 1 to 80 characters.";
  if (!Number.isFinite(price) || price < 0 || price > 10000) return "Price must be a number from 0 to 10000.";
  return { menuName, name, price };
}

const addMenu = async (req, res, next) => {
  try {
    const dish = readDish(req.body);
    if (typeof dish === "string") return next(createHttpError(400, dish));
    const saved = await addDish(accountIdOf(req.user), dish);
    res.status(201).json({
      success: true,
      message: "Dish added.",
      data: saved,
    });
  } catch (error) {
    next(error);
  }
};

const getMenus = async (req, res, next) => {
  try {
    const menus = await getMenusForAccount(accountIdOf(req.user));

    // console.log("📦 [getMenus] Raw data from DynamoDB:", JSON.stringify(menus, null, 2));

    // if (!menus || menus.length === 0) {
    // //   console.warn("⚠️ [getMenus] No menu items found in database.");
    //   return next(createHttpError(404, "No menu items found"));
    // }

    // console.log(`✅ [getMenus] Found ${menus.length} menu(s).`);

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