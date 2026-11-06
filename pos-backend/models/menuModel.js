const { randomUUID } = require("node:crypto");
const docClient = require("../config/database");
const { PutCommand, ScanCommand } = require("@aws-sdk/lib-dynamodb");
const config = require("../config/config");
const { DEFAULT_ACCOUNT_ID } = require("./account");

const TABLE_NAME = config.menuItemsTable;

async function scanMenus() {
  const items = [];
  let startKey;
  do {
    const data = await docClient.send(new ScanCommand({
      TableName: TABLE_NAME,
      ExclusiveStartKey: startKey,
    }));
    items.push(...(data.Items ?? []));
    startKey = data.LastEvaluatedKey;
  } while (startKey);
  return items;
}

function displayName(item) {
  return item.displayName || item.menuName;
}

function belongsToAccount(item, accountId) {
  if (item.accountId) return item.accountId === accountId;
  return accountId === DEFAULT_ACCOUNT_ID && !String(item.menuName).includes("#");
}

function presentMenu(item) {
  return {
    menuName: displayName(item),
    icon: item.icon,
    bgColor: item.bgColor,
    accountId: item.accountId || DEFAULT_ACCOUNT_ID,
    items: Array.isArray(item.items) ? item.items : [],
  };
}

async function getMenusForAccount(accountId) {
  const items = await scanMenus();
  return items.filter((item) => belongsToAccount(item, accountId)).map(presentMenu);
}

async function findStoredCategory(accountId, menuName) {
  const items = await scanMenus();
  return items.find((item) => belongsToAccount(item, accountId) && displayName(item) === menuName);
}

function storageKey(accountId, menuName, existing) {
  if (existing?.menuName) return existing.menuName;
  if (accountId === DEFAULT_ACCOUNT_ID) return menuName;
  return `${accountId}#${menuName}`;
}

async function saveCategory(accountId, menuName, items, existing) {
  await docClient.send(new PutCommand({
    TableName: TABLE_NAME,
    Item: {
      ...(existing ?? {}),
      menuName: storageKey(accountId, menuName, existing),
      displayName: menuName,
      accountId: existing?.accountId || accountId,
      icon: existing?.icon || "",
      bgColor: existing?.bgColor || "#F8FAFC",
      items,
    },
  }));
}

async function addDish(accountId, input) {
  const menuName = input.menuName.trim();
  const name = input.name.trim();
  const price = Number(input.price);
  const existing = await findStoredCategory(accountId, menuName);
  const uuid = randomUUID();
  const dish = {
    uuid,
    name,
    price,
    imageKey: `accounts/${accountId}/${uuid}.png`,
  };
  const items = [...(Array.isArray(existing?.items) ? existing.items : []), dish];
  await saveCategory(accountId, menuName, items, existing);
  return { menuName, dish };
}

module.exports = {
  getMenusForAccount,
  addDish,
};
