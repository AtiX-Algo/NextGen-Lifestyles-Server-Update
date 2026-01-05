const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: { 
      type: String, 
      required: true 
    },

    email: { 
      type: String, 
      required: true, 
      unique: true 
    },

    password: { 
      type: String, 
      required: true 
    },

    phone: { 
      type: String, 
      default: "" 
    },

    address: { 
      type: String, 
      default: "" 
    },

    // ✅ Map Coordinates
    location: {
      lat: { type: Number },
      lng: { type: Number }
    },

    // ✅ NEW: Wishlist (Stores Product IDs)
    wishlist: [
      { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Product' 
      }
    ],

    avatar: { 
      type: String, 
      default: ""   // URL to profile image
    },

    isVerified: { 
      type: Boolean, 
      default: false 
    },

    otp: { 
      type: String 
    },

    otpExpires: { 
      type: Date 
    },

    // Roles: customer | admin | delivery_man
    role: { 
      type: String, 
      enum: ['customer', 'admin', 'delivery_man'], 
      default: 'customer' 
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
