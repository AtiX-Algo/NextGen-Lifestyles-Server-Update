// server/controllers/authController.js
const dotenv = require('dotenv');
dotenv.config();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sendEmail = require('../utils/sendEmail');

// Helper: Generate 6-digit OTP
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// Helper: Password Policy (Min 8 chars, at least 1 letter and 1 number)
const isStrongPassword = (password) => {
  const regex = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
  return regex.test(password);
};

/* ======================================================
   1. REGISTER USER
====================================================== */
exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check Password Policy (SRS Requirement)
    if (!isStrongPassword(password)) {
      return res.status(400).json({ message: "Password must be at least 8 characters long and contain both letters and numbers." });
    }

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists. Please log in or reset your password." });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate OTP
    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Create User
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      otp,
      otpExpires,
    });

    await newUser.save();

    // 📧 Send Verification Email
    const message = `Your verification code is: ${otp}`;
    const html = `
      <div style="font-family: Arial; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
        <h2 style="color: #D96C46;">Welcome to NextGen</h2>
        <p>Use the OTP below to verify your account:</p>
        <h1 style="letter-spacing: 5px; text-align: center;">${otp}</h1>
        <p>This OTP expires in 10 minutes.</p>
      </div>
    `;

    await sendEmail({
      email,
      subject: 'NextGen - Account Verification',
      message,
      html,
    });

    res.status(201).json({ message: "OTP sent to email" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

/* ======================================================
   2. VERIFY OTP
====================================================== */
exports.verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
        return res.status(400).json({ message: "Email and OTP are required" });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "User not found" });

    // Validate OTP
    if (user.otp !== otp || user.otpExpires < Date.now()) {
        return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    // Mark as verified and clear OTP
    user.isVerified = true;
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    // Generate Token
    const jwtSecret = process.env.JWT_SECRET || "temp_fallback_secret_123";
    const token = jwt.sign(
      { id: user._id, role: user.role },
      jwtSecret,
      { expiresIn: '1d' }
    );

    res.status(200).json({
      message: "Account verified",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

/* ======================================================
   3. RESEND OTP (NEW)
====================================================== */
exports.resendOTP = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.isVerified) return res.status(400).json({ message: "Account is already verified" });

    // Generate new OTP
    const otp = generateOTP();
    user.otp = otp;
    user.otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    await user.save();

    // 📧 Send Email
    const message = `Your new verification code is: ${otp}`;
    const html = `
      <div style="font-family: Arial; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
        <h2 style="color: #D96C46;">NextGen - Resend OTP</h2>
        <p>Use the new OTP below to verify your account:</p>
        <h1 style="letter-spacing: 5px; text-align: center;">${otp}</h1>
        <p>This OTP expires in 10 minutes.</p>
      </div>
    `;

    await sendEmail({
      email,
      subject: 'NextGen - New Verification Code',
      message,
      html,
    });

    res.status(200).json({ message: "A new OTP has been sent to your email" });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

/* ======================================================
   4. LOGIN
====================================================== */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Check verification status
    if (!user.isVerified) {
      return res.status(400).json({ message: "Account not verified. Please verify your email first.", unverified: true });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Generate Token
    const jwtSecret = process.env.JWT_SECRET || "temp_fallback_secret_123";
    const token = jwt.sign(
      { id: user._id, role: user.role },
      jwtSecret,
      { expiresIn: '1d' }
    );

    res.status(200).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

/* ======================================================
   5. FORGOT PASSWORD
====================================================== */
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Generate OTP
    const otp = generateOTP();
    user.otp = otp;
    user.otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    await user.save();

    // 📧 Send Reset Email
    const message = `Your password reset OTP is: ${otp}`;
    const html = `
      <div style="font-family: Arial; padding: 20px;">
        <h2 style="color: #EF4444;">Reset Password</h2>
        <p>Use the OTP below to reset your password:</p>
        <h1 style="letter-spacing: 5px; text-align: center;">${otp}</h1>
        <p>This OTP expires in 10 minutes.</p>
      </div>
    `;

    await sendEmail({
      email,
      subject: 'NextGen - Password Reset OTP',
      message,
      html,
    });

    res.status(200).json({ message: "OTP sent to email" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

/* ======================================================
   6. RESET PASSWORD
====================================================== */
exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    // Check Password Policy
    if (!isStrongPassword(newPassword)) {
      return res.status(400).json({ message: "Password must be at least 8 characters long and contain both letters and numbers." });
    }

    const user = await User.findOne({ email });

    // Validate OTP
    if (!user || user.otp !== otp || user.otpExpires < Date.now()) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    
    // Clear OTP fields
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};