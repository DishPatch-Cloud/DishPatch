// scripts/setMenuDescriptions.js
/**
 * Save the example descriptions from constants onto the matching dishes.
 *
 * MENU_ITEMS_TABLE comes from the POS backend stack output MenuItemsTableName.
 */

const { menus } = require("../constants/index.js");
const { setDishDescription } = require("../models/menuModel");

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Set ${name} from the POS backend stack outputs.`);
  return value;
}

async function setMenuDescriptions() {
  required("MENU_ITEMS_TABLE");
  let saved = 0;
  let missing = 0;

  for (const category of menus) {
    for (const item of category.items) {
      if (!item.description) continue;
      const dish = await setDishDescription(item.uuid, item.description);
      if (dish) {
        saved += 1;
        console.log(`Saved a description on "${dish.name}".`);
      } else {
        missing += 1;
        console.log(`No dish has uuid ${item.uuid} (${item.name}).`);
      }
    }
  }

  console.log(`Done. ${saved} descriptions saved, ${missing} dishes were not found.`);
}

setMenuDescriptions()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Description update failed:", err.message ?? err);
    process.exit(1);
  });
