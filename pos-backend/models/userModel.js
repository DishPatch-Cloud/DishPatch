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

// Find the POS profile linked to an Auth0 subject.
async function getUserByAuth0Subject(subject) {
  const result = await docClient.send(new QueryCommand({
    TableName: TABLE_NAME,
    IndexName: "Auth0SubjectIndex",
    KeyConditionExpression: "auth0Subject = :subject",
    ExpressionAttributeValues: { ":subject": subject },
  }));
  return result.Items?.[0];
}

// Open a POS profile for an Auth0 user. The first profile in this stack is the owner.
// An existing email keeps its role and is linked to this Auth0 subject.
async function ensureAuth0User({ subject, email, name, emailVerified }) {
  const existingBySubject = await getUserByAuth0Subject(subject);
  if (existingBySubject) return existingBySubject;

  const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
  if (!validateEmail(normalizedEmail)) {
    throw Object.assign(new Error("Auth0 did not provide an email address."), { statusCode: 400 });
  }
  // Only a verified email may open or claim a profile. Otherwise someone could sign up with a
  // colleague's address and take over their role.
  if (emailVerified !== true) {
    throw Object.assign(new Error("Verify your email address in DishPatch before using the POS."), { statusCode: 403 });
  }

  const existingByEmail = await getUserByEmail(normalizedEmail);
  if (existingByEmail) {
    if (existingByEmail.auth0Subject && existingByEmail.auth0Subject !== subject) {
      throw Object.assign(new Error("This email is already linked to a different sign-in."), { statusCode: 409 });
    }
    if (!existingByEmail.auth0Subject) {
      await docClient.send(new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { userId: existingByEmail.userId },
        UpdateExpression: "set auth0Subject = :subject, updatedAt = :updatedAt",
        ExpressionAttributeValues: {
          ":subject": subject,
          ":updatedAt": new Date().toISOString(),
        },
      }));
      existingByEmail.auth0Subject = subject;
    }
    return existingByEmail;
  }

  const role = (await hasAnyUser()) ? "staff" : "owner";
  const item = {
    userId: subject,
    auth0Subject: subject,
    role,
    name: name || normalizedEmail,
    email: normalizedEmail,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await docClient.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));
  return item;
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
  getUserByAuth0Subject,
  ensureAuth0User,
  getUserById, // 👈 added export
  verifyPassword,
  updateUser,
};