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
  getRecommendedProducts 
} = require('../controllers/productController');

const { protect, admin } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.get('/', getProducts);
router.get('/seed', seedProducts);
router.get('/recommendations', getRecommendedProducts);
router.get('/:id', getProductById);

// ✅ Admin Routes
// We wrap Multer in an error handler so it sends JSON instead of an HTML crash page
router.post('/', protect, admin, (req, res, next) => {
    upload.array('images', 5)(req, res, function (err) {
        if (err) {
            console.error("❌ MULTER/CLOUDINARY UPLOAD ERROR:", err);
            return res.status(400).json({ message: "Image upload failed. Please check your Cloudinary keys or file sizes. Error: " + err.message });
        }
        next();
    });
}, createProduct);

router.put('/:id', protect, admin, (req, res, next) => {
    upload.array('images', 5)(req, res, function (err) {
        if (err) {
            console.error("❌ MULTER/CLOUDINARY UPLOAD ERROR:", err);
            return res.status(400).json({ message: "Image upload failed. Error: " + err.message });
        }
        next();
    });
}, updateProduct);

router.delete('/:id', protect, admin, deleteProduct);
router.route('/:id/reviews').post(protect, createProductReview);

module.exports = router;