const mongoose = require('mongoose');

const orderSchema = mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
    customerName: { type: String },
    phone: { type: String, required: true },
    address: { type: String, required: true },
    city: { type: String, required: true },
    
    // 👇 Map coordinates and pricing breakdown 👇
    location: { 
      lat: { type: Number }, 
      lng: { type: Number } 
    },
    itemsPrice: { type: Number, default: 0.0 },
    shippingPrice: { type: Number, default: 0.0 },
    taxPrice: { type: Number, default: 0.0 },
    discountAmount: { type: Number, default: 0.0 },
    // 👆 END NEW FIELDS 👆

    totalAmount: { type: Number, required: true, default: 0.0 },
    
    // Aligned exactly with SRS Options + Return statuses for Module 3
    orderStatus: {
      type: String,
      enum: ['Pending', 'Confirmed', 'Delivered', 'Cancelled', 'Return_Requested', 'Returned', 'Return_Rejected'],
      default: 'Pending',
    },

    returnReason: { type: String },
    returnStatus: { type: String, enum: ['Pending', 'Approved', 'Rejected'] },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Order', orderSchema);