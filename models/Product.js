const mongoose = require('mongoose');

// -----------------------------
// Review Subdocument Schema
// -----------------------------
const reviewSchema = new mongoose.Schema({
  name: { type: String, required: true }, // reviewer name
  rating: { type: Number, required: true },
  comment: { type: String, required: true },
  user: { // reference to the User who wrote the review
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User',
  },
}, { timestamps: true });

// -----------------------------
// Product Schema
// -----------------------------
const productSchema = new mongoose.Schema({
  user: { // who added the product
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User',
  },
  name: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true, default: 0 },
  category: { type: String, required: true },
  brand: { type: String, required: true },
  stock: { type: Number, required: true, default: 0 },
  images: [{ type: String }], // array of image URLs
  colors: [{ type: String }],
  sizes: [{ type: String }],
  
  // ✅ Reviews
  reviews: [reviewSchema],
  rating: { type: Number, required: true, default: 0 },
  numReviews: { type: Number, required: true, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);
