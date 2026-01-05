const dotenv = require('dotenv');
dotenv.config();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sendEmail = require('../utils/sendEmail');

// Helper: Generate 6-digit OTP
const generateOTP = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

/* ======================================================
   1. REGISTER USER (WITH REAL EMAIL OTP)
====================================================== */
exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
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
        <h2 style="color: #4F46E5;">Welcome to NextGen</h2>
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
   2. VERIFY OTP (FIXED)
====================================================== */
exports.verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    console.log(`🔹 Verifying: Email=[${email}] OTP=[${otp}]`);

    // 1. Check Secret Key (Debug helper)
    if (!process.env.JWT_SECRET) {
        console.error("🔥 CRITICAL ERROR: JWT_SECRET is missing in .env file!");
        // Fallback (Only for dev, helps prevent crash)
        process.env.JWT_SECRET = "temp_fallback_secret_123"; 
    }

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

    console.log("✅ User verified. Generating Token...");

    // Generate Token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
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
    console.error("🔥 SERVER ERROR in verifyOTP:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

/* ======================================================
   3. LOGIN (WITH ROLE)
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
      return res.status(400).json({ message: "Account not verified. Please verify OTP." });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Generate Token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
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
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

/* ======================================================
   4. FORGOT PASSWORD (SEND OTP)
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
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

/* ======================================================
   5. RESET PASSWORD
====================================================== */
exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

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
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};