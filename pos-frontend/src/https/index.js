import { axiosWrapper } from "./axiosWrapper";

// API Endpoints

// Auth Endpoints. Sign-in is Auth0. This only reads the POS profile.
export const getUserData = () => axiosWrapper.get("/api/user");

// Table Endpoints
export const addTable = (data) => axiosWrapper.post("/api/table/", data);
export const getTables = () => axiosWrapper.get("/api/table");
export const updateTable = ({ tableNo, ...tableData }) =>
  axiosWrapper.put(`/api/table/${tableNo}`, tableData);

// Payment Endpoints (SQS)
export const sendPaymentMessage = (data) =>
  axiosWrapper.post("/api/payment", data);

// Order Endpoints
export const addOrder = (data) => axiosWrapper.post("/api/order/", data);
export const getOrders = () => axiosWrapper.get("/api/order");
export const updateOrderStatus = ({ orderId, orderStatus }) =>
  axiosWrapper.put(`/api/order/${orderId}`, { orderStatus });

// Menu Endpoints
export const getMenus = () => axiosWrapper.get("/api/menu");
export const addMenu = (data) => axiosWrapper.post("/api/menu", data);
export const createMenuPhotoUpload = (uuid, contentType) =>
  axiosWrapper.post(`/api/menu/${uuid}/photo`, { contentType });
export const saveMenuPhoto = (uuid, imageUrl) =>
  axiosWrapper.put(`/api/menu/${uuid}/photo`, { imageUrl });

// Users in this location. Staff and admin can read the list. Admin can change a role.
export const getStaff = () => axiosWrapper.get("/api/user/staff");
export const setStaffRole = (userId, role) =>
  axiosWrapper.put(`/api/user/staff/${userId}/role`, { role });
export const claimAdmin = () => axiosWrapper.post("/api/user/claim-admin");
