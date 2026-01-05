const express = require('express');
const router = express.Router();
const { 
  getProducts, 
  getProductById, 
  seedProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  createProductReview,
  getRecommendedProducts  // <--- Import the new function
} = require('../controllers/productController');

const { protect, admin } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.get('/', getProducts);
router.get('/seed', seedProducts);
router.get('/recommendations', getRecommendedProducts); // 👈 Add this before /:id route
router.get('/:id', getProductById);

// ✅ Admin Routes
router.post('/', protect, admin, upload.single('image'), createProduct);
router.put('/:id', protect, admin, upload.single('image'), updateProduct);
router.delete('/:id', protect, admin, deleteProduct);
router.route('/:id/reviews').post(protect, createProductReview);

module.exports = router;