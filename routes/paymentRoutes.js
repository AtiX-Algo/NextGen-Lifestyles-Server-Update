const express = require('express');
const router = express.Router();
const { createPaymentIntent } = require('../controllers/paymentController');
const { protect } = require('../middleware/authMiddleware');

// Protected route (Only logged in users can pay)
router.post('/create-intent', protect, createPaymentIntent);

module.exports = router;