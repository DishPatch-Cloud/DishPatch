const { randomUUID } = require("node:crypto");
const docClient = require("../config/database");
const { GetCommand, PutCommand, ScanCommand } = require("@aws-sdk/lib-dynamodb");
const config = require("../config/config");

const TABLE_NAME = config.menuItemsTable;

/**
 * Get all menu items from DynamoDB
 */
async function getAllMenuItems() {
  const data = await docClient.send(new ScanCommand({ TableName: TABLE_NAME }));
  return data.Items;
}

/**
 * Add a new menu item or category
 * @param {Object} menu - Menu object with { menuName, bgColor, icon, items }
 */
async function addMenuItem(menu) {
  const params = new PutCommand({
    TableName: TABLE_NAME,
    Item: menu,
  });

  await docClient.send(params);
}

/**
 * Add a dish to a category. The category is created when it does not exist.
 * The menu belongs to the whole POS stack, so every staff login sees the same dishes.
 * @param {{ menuName: string, name: string, price: number }} input
 */
async function addDish({ menuName, name, price }) {
  const existing = await docClient.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: { menuName },
  }));
  const category = existing.Item ?? { menuName, bgColor: "#F8FAFC", icon: "", items: [] };
  const dish = { uuid: randomUUID(), name, price };
  const updated = { ...category, items: [...(category.items ?? []), dish] };

  await docClient.send(new PutCommand({ TableName: TABLE_NAME, Item: updated }));
  return { menuName, dish };
}

module.exports = {
  getAllMenuItems,
  addMenuItem,
  addDish,
};
