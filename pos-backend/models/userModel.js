const docClient = require("../config/database");
const config = require("../config/config");
const { GetCommand, PutCommand, QueryCommand, ScanCommand, UpdateCommand } = require("@aws-sdk/lib-dynamodb");
const { v4: uuidv4 } = require("uuid");
const bcrypt = require("bcrypt");

const TABLE_NAME = config.usersTable; // ✅ use CloudFormation-injected table name

// Helper: validate email format
function validateEmail(email) {
  return /\S+@\S+\.\S+/.test(email);
}

// Create a new user
async function createUser(user) {
  if (!validateEmail(user.email)) {
    throw new Error("Email must be in valid format!");
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(user.password, salt);

  const userId = user.userId || uuidv4();

  const params = new PutCommand({
    TableName: TABLE_NAME,
    Item: {
      userId,
      role: user.role || "staff",
      name: user.name,
      email: user.email,
      password: hashedPassword,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  });

  await docClient.send(params);
  return { userId, ...user, password: undefined }; // don’t return password
}

// True when the table already holds a user. The first user of a stack becomes its owner.
async function hasAnyUser() {
  const result = await docClient.send(new ScanCommand({ TableName: TABLE_NAME, Limit: 1 }));
  return (result.Items?.length ?? 0) > 0;
}

// Every user in this stack, without password hashes.
async function listUsers() {
  const users = [];
  let startKey;
  do {
    const result = await docClient.send(new ScanCommand({
      TableName: TABLE_NAME,
      ExclusiveStartKey: startKey,
    }));
    users.push(...(result.Items ?? []));
    startKey = result.LastEvaluatedKey;
  } while (startKey);
  return users.map(({ userId, name, email, role }) => ({ userId, name, email, role: role || "owner" }));
}

// Returns null when the user does not exist.
async function setUserRole(userId, role) {
  try {
    const result = await docClient.send(new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { userId },
      UpdateExpression: "set #role = :role, updatedAt = :updatedAt",
      ExpressionAttributeNames: { "#role": "role" },
      ExpressionAttributeValues: { ":role": role, ":updatedAt": new Date().toISOString() },
      ConditionExpression: "attribute_exists(userId)",
      ReturnValues: "ALL_NEW",
    }));
    return result.Attributes;
  } catch (error) {
    if (error.name === "ConditionalCheckFailedException") return null;
    throw error;
  }
}

// Get user by email (for login)
async function getUserByEmail(email) {
  const params = new QueryCommand({
    TableName: TABLE_NAME,
    IndexName: "EmailIndex",
    KeyConditionExpression: "#email = :email",
    ExpressionAttributeNames: {
      "#email": "email",
    },
    ExpressionAttributeValues: {
      ":email": email,
    },
  });

  const result = await docClient.send(params);
  return result.Items?.[0];
}

// ✅ Get user by userId (for token verification)
async function getUserById(userId) {
  const params = new GetCommand({
    TableName: TABLE_NAME,
    Key: { userId },
  });

  const result = await docClient.send(params);
  return result.Item;
}

// Verify password
async function verifyPassword(inputPassword, hashedPassword) {
  return await bcrypt.compare(inputPassword, hashedPassword);
}

// Update user (e.g., name)
async function updateUser(userId, updates) {
  const params = new UpdateCommand({
    TableName: TABLE_NAME,
    Key: { userId },
    UpdateExpression: "set #name = :name, updatedAt = :updatedAt",
    ExpressionAttributeNames: {
      "#name": "name",
    },
    ExpressionAttributeValues: {
      ":name": updates.name,
      ":updatedAt": new Date().toISOString(),
    },
    ReturnValues: "ALL_NEW",
  });

  const result = await docClient.send(params);
  return result.Attributes;
}

module.exports = {
  createUser,
  hasAnyUser,
  listUsers,
  setUserRole,
  getUserByEmail,
  getUserById, // 👈 added export
  verifyPassword,
  updateUser,
};