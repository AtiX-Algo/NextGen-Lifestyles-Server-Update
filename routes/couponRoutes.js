const express = require('express');
const router = express.Router();
const { createCoupon, getAllCoupons, deleteCoupon, validateCoupon } = require('../controllers/couponController');
const { protect, admin } = require('../middleware/authMiddleware');

// Public Route (Validate)
router.post('/validate', validateCoupon);

// Admin Routes (CRUD)
router.get('/', getAllCoupons); // Can be public or protected depending on preference
router.post('/create', protect, admin, createCoupon);
router.delete('/:id', protect, admin, deleteCoupon);

module.exports = router;