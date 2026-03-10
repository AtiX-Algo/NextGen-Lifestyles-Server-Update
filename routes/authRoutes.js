// server/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const { 
  register, 
  verifyOTP, 
  resendOTP, // 👈 ADDED
  login, 
  forgotPassword, 
  resetPassword 
} = require('../controllers/authController');

router.post('/register', register);
router.post('/verify', verifyOTP);
router.post('/resend-otp', resendOTP); // 👈 ADDED
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

module.exports = router;