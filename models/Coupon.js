const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true, // Auto-uppercase 'save10' -> 'SAVE10'
    trim: true,
  },
  description: { type: String, required: true },
  discountPercentage: { type: Number, required: true, min: 1, max: 100 },
  minPurchaseAmount: { type: Number, required: true, default: 0 },
  maxPurchaseAmount: { type: Number, required: true, default: 0 },
  expirationDate: { type: Date, required: true },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

// Optional: Auto-expire check
couponSchema.methods.isValid = function() {
  return this.isActive && this.expirationDate > Date.now();
};

module.exports = mongoose.model('Coupon', couponSchema);