const mongoose = require('mongoose');

const orderItemSchema = mongoose.Schema({
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  variantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Variant' }, // For Module 1 later
  productName: { type: String, required: true },
  size: { type: String },
  quantity: { type: Number, required: true },
  price: { type: Number, required: true },
  image: { type: String }
});

module.exports = mongoose.model('OrderItem', orderItemSchema);