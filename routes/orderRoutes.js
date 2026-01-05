// server/routes/orderRoutes.js
const express = require('express');
const router = express.Router();
const {
  addOrderItems,
  getOrderById,
  updateOrderToPaid,
  getMyOrders,
  getOrders,
  updateOrderToDelivered,
  assignDeliveryMan,
  getDeliveryManOrders,
  updateOrderStatus,
  getAdminAnalytics,
  requestOrderReturn, // 👈 Added
  handleReturnRequest // 👈 Added
} = require('../controllers/orderController');

// 👇 Import Middleware
const { protect, admin } = require('../middleware/authMiddleware');

// =======================
// Main Routes
// =======================

// User creates order / Admin gets all orders
router.route('/')
  .post(protect, addOrderItems)
  .get(protect, admin, getOrders);

// Get logged-in user's orders
router.route('/myorders').get(protect, getMyOrders);

// ✅ Analytics Route (Admin Only)
// Placed BEFORE /:id to avoid route collision
router.get('/analytics', protect, admin, getAdminAnalytics);

// =======================
// User Specific Operations
// =======================

// Get specific order by ID
router.route('/:id').get(protect, getOrderById);

// Update order to paid
router.route('/:id/pay').put(protect, updateOrderToPaid);

// ✅ NEW: User requests an order return
router.put('/:id/return-request', protect, requestOrderReturn);

// =======================
// Admin Specific Operations
// =======================

// Update delivery status (Admin manual)
router.route('/:id/deliver').put(protect, admin, updateOrderToDelivered);

// Assign delivery man to an order (Admin)
router.route('/:id/assign').put(protect, admin, assignDeliveryMan);

// ✅ NEW: Admin handles (Approve/Reject) return request
router.put('/:id/return-handle', protect, admin, handleReturnRequest);

// =======================
// Delivery Man Routes
// =======================

// Get tasks for assigned delivery man
router.route('/delivery/my-tasks').get(protect, getDeliveryManOrders);

// Update status (Out for Delivery / Delivered)
router.route('/:id/status').put(protect, updateOrderStatus);

module.exports = router;