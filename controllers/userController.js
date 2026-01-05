const User = require('../models/User');
const Product = require('../models/Product'); // ✅ Import Product model
const bcrypt = require('bcryptjs');

/**
 * 1. Get User Profile
 */
exports.getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      address: user.address,
      location: user.location,
      avatar: user.avatar,
      role: user.role,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

/**
 * 2. Update User Profile (with Location)
 */
exports.updateUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      user.name = req.body.name || user.name;
      user.phone = req.body.phone || user.phone;
      user.address = req.body.address || user.address;
      
      // Update Avatar if file exists
      if (req.file) {
        user.avatar = `/uploads/${req.file.filename}`;
      }

      // Handle Location (it comes as stringified JSON in FormData)
      if (req.body.location) {
         try {
             const loc = JSON.parse(req.body.location);
             user.location = loc;
         } catch(e) { console.log("Location parse error", e); }
      }

      const updatedUser = await user.save();
      res.json({ ...updatedUser._doc }); // Return full user
    }
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

/**
 * 3. Change Password
 */
exports.updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid current password' });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

/**
 * 4. Toggle Wishlist (Add or Remove)
 */
exports.toggleWishlist = async (req, res) => {
  try {
    const { productId } = req.body;

    // Optional: Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const user = await User.findById(req.user._id);

    const index = user.wishlist.findIndex(
      (id) => id.toString() === productId
    );

    if (index === -1) {
      // ✅ Add to wishlist
      user.wishlist.push(productId);
      await user.save();
      return res.json({
        message: 'Added to Wishlist',
        wishlist: user.wishlist,
      });
    } else {
      // ✅ Remove from wishlist
      user.wishlist.splice(index, 1);
      await user.save();
      return res.json({
        message: 'Removed from Wishlist',
        wishlist: user.wishlist,
      });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

/**
 * 5. Get My Wishlist (Populated)
 */
exports.getMyWishlist = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('wishlist');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user.wishlist);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

/**
 * 6. Get All Users (Admin)
 */
exports.getUsers = async (req, res) => {
  try {
    const users = await User.find({});
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

/**
 * 7. Update User Role (Admin) with Socket.IO Notification
 */
exports.updateUserRole = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (user) {
      user.role = req.body.role; 
      const updatedUser = await user.save();

      // ===========================================
      // SOCKET.IO: Notify the specific user
      // ===========================================
      // Note: Ensure app.set('socketio', io) is in your server.js
      const io = req.app.get('socketio');
      
      if (io) {
          // Emit event to the room named after the User ID
          console.log(`📢 Emitting 'role_updated' to room: ${user._id}`);
          io.to(user._id.toString()).emit('role_updated', { 
            role: user.role, 
            message: "Your role has been updated!" 
          });
      }

      res.json({ message: "User role updated", user: updatedUser });
    } else {
      res.status(404).json({ message: "User not found" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};