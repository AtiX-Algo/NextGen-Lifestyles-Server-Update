// server/routes/orderRoutes.js
const express = require('express');
const router = express.Router();

// Import all 9 functions from your controller (Added updateOrderShipping)
const {
  addOrderItems,
  getOrderById,
  getMyOrders,
  getOrders,
  updateOrderStatus, 
  updateOrderShipping, // 👈 NEW: Added for shipping edits
  getAdminAnalytics,
  requestOrderReturn,
  handleReturnRequest
} = require('../controllers/orderController');

// Import Auth Middleware
const { protect, admin } = require('../middleware/authMiddleware');

// =======================
// Main Routes
// =======================

// Create a new order (User) OR Get all orders (Admin)
router.route('/')
  .post(protect, addOrderItems)
  .get(protect, admin, getOrders);

// Get logged-in user's orders
router.route('/myorders').get(protect, getMyOrders);

// Analytics Route (Admin Only) 
router.get('/analytics', protect, admin, getAdminAnalytics);

// =======================
// Specific Order Operations
// =======================

// Get specific order by ID
router.route('/:id').get(protect, getOrderById);

// Update order status (Admin manually changing Pending -> Confirmed -> Delivered)
router.put('/:id/status', protect, admin, updateOrderStatus);

// 👈 NEW ROUTE: Update shipping price manually (Admin)
router.put('/:id/shipping', protect, admin, updateOrderShipping);

// User requests an order return
router.put('/:id/return-request', protect, requestOrderReturn);

// Admin handles (Approve/Reject) return request
router.put('/:id/return-handle', protect, admin, handleReturnRequest);

module.exports = router;