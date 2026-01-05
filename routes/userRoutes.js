const express = require('express');
const router = express.Router();

const {
  getUserProfile,
  updateUserProfile,
  updatePassword,
  toggleWishlist,
  getMyWishlist,
  getUsers,
  updateUserRole,
} = require('../controllers/userController');

const { protect, admin } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

/* ======================================================
   USER ROUTES (Protected)
====================================================== */

// Get / Update Profile
router.route('/profile')
  .get(protect, getUserProfile)
 .put(protect, upload.single('avatar'), updateUserProfile);

// Change Password
router.put('/password', protect, updatePassword);

// Wishlist (Add / Remove & Get)
router.route('/wishlist')
  .post(protect, toggleWishlist)
  .get(protect, getMyWishlist);

/* ======================================================
   ADMIN ROUTES
====================================================== */

// Get All Users
router.get('/', protect, admin, getUsers);

// Update User Role
router.put('/:id/role', protect, admin, updateUserRole);

module.exports = router;
