// server/models/Order.js
const mongoose = require('mongoose');

const orderSchema = mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },

    // ✅ Assigned Delivery Man
    deliveryMan: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    orderItems: [
      {
        name: { type: String, required: true },
        quantity: { type: Number, required: true },
        image: { type: String, required: true },
        price: { type: Number, required: true },
        product: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Product' },
        color: { type: String },
        size: { type: String },
      },
    ],

    shippingAddress: {
      address: { type: String, required: true },
      city: { type: String, required: true },
      phone: { type: String, required: true },
      location: { lat: Number, lng: Number }, // Map coordinates
    },

    paymentMethod: { type: String, required: true },
    paymentResult: {
      id: { type: String },
      status: { type: String },
      email_address: { type: String },
    },

    itemsPrice: { type: Number, required: true, default: 0.0 },
    taxPrice: { type: Number, required: true, default: 0.0 },
    shippingPrice: { type: Number, required: true, default: 0.0 },
    totalPrice: { type: Number, required: true, default: 0.0 },

    isPaid: { type: Boolean, required: true, default: false },
    paidAt: { type: Date },

    isDelivered: { type: Boolean, required: true, default: false },
    deliveredAt: { type: Date },

    // ✅ Updated Status Stages with Return Support
    status: {
      type: String,
      enum: [
        'Processing', 
        'Shipped', 
        'Out_for_Delivery', 
        'Delivered', 
        'Cancelled', 
        'Return_Requested', 
        'Returned', 
        'Return_Rejected'
      ],
      default: 'Processing',
    },

    // ✅ NEW: Return Information Fields
    returnReason: { 
      type: String 
    },
    
    returnStatus: { 
      type: String, 
      enum: ['Pending', 'Approved', 'Rejected'],
      // Only applicable if status is Return_Requested or beyond
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Order', orderSchema);