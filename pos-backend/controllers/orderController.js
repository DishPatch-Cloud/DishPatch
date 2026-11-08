const createHttpError = require("http-errors");
const { roleOf } = require("../middlewares/roles");
const {
  createOrder,
  getOrder,          // from orderModel
  listOrders,        // ✅ use this, not getAllOrders
  updateOrderStatus,
} = require("../models/orderModel");

function seesEveryOrder(user) {
  const role = roleOf(user);
  return role === "admin" || role === "staff";
}

function canReadOrder(order, user) {
  if (seesEveryOrder(user)) return true;
  return order?.orderedBy?.userId === user.userId;
}

// ➤ Add a new order. The signed-in account is recorded by the server.
const addOrder = async (req, res, next) => {
  try {
    const body = { ...(req.body || {}) };
    delete body.orderedBy;
    const order = await createOrder({
      ...body,
      orderedBy: {
        userId: req.user.userId,
        name: req.user.name,
        email: req.user.email,
      },
    });
    res.status(201).json({
      success: true,
      message: "Order created!",
      data: order,
    });
  } catch (error) {
    console.error("❌ Error in addOrder:", error);
    next(error);
  }
};

// ➤ Get an order by ID
const getOrderById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const order = await getOrder(id);
    if (!order || !canReadOrder(order, req.user)) {
      return next(createHttpError(404, "Order not found!"));
    }

    res.status(200).json({ success: true, data: order });
  } catch (error) {
    console.error("❌ Error in getOrderById:", error);
    next(error);
  }
};

// ➤ Get all orders
const getOrders = async (req, res, next) => {
  try {
    const orders = await listOrders();
    // console.log("📦 Raw Orders from DynamoDB:", JSON.stringify(orders, null, 2));

    const normalizedOrders = orders
      .filter((order) => canReadOrder(order, req.user))
      .map((o) => ({
        ...o,
        tableNo: o.table?.tableNo?.S || o.table?.tableNo || o.table || null,
      }));

    // console.log("✅ Normalized Orders:", normalizedOrders);

    res.status(200).json({ success: true, data: normalizedOrders });
  } catch (error) {
    console.error("❌ Error in getOrders:", error);
    next(error);
  }
};

// ➤ Update order status
const updateOrder = async (req, res, next) => {
  try {
    const { orderStatus } = req.body;
    const { id } = req.params;

    const existing = await getOrder(id);
    if (!existing || !canReadOrder(existing, req.user)) {
      return next(createHttpError(404, "Order not found!"));
    }

    const order = await updateOrderStatus(id, orderStatus);
    if (!order) {
      return next(createHttpError(404, "Order not found!"));
    }

    res.status(200).json({
      success: true,
      message: "Order updated",
      data: order,
    });
  } catch (error) {
    console.error("❌ Error in updateOrder:", error);
    next(error);
  }
};

module.exports = { addOrder, getOrderById, getOrders, updateOrder };
