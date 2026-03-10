const Product = require('../models/Product');
const User = require('../models/User'); 
const cloudinary = require('cloudinary').v2;

// 1. Get All Products
exports.getProducts = async (req, res) => {
  try {
    const { keyword, category, minPrice, maxPrice, page = 1, limit = 12 } = req.query;
    
    let query = {};

    if (keyword) query.name = { $regex: keyword, $options: 'i' };
    if (category) query.category = category;

    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);
    const skip = (pageNumber - 1) * limitNumber;

    const products = await Product.find(query).skip(skip).limit(limitNumber);
    const totalProducts = await Product.countDocuments(query);

    res.status(200).json({
      products,
      currentPage: pageNumber,
      totalPages: Math.ceil(totalProducts / limitNumber),
      totalProducts
    });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// 2. Get Single Product
exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.status(200).json(product);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// 3. Seed Database
exports.seedProducts = async (req, res) => {
  try {
    await Product.deleteMany(); 
    const adminUser = await User.findOne({ role: 'admin' });
    
    if (!adminUser) {
        return res.status(400).json({ message: "Please create an Admin user first." });
    }

    const dummyProducts = [
      {
        user: adminUser._id,
        name: "Premium Panjabi",
        description: "High quality traditional wear.",
        price: 99.99,
        category: "Panjabi",
        brand: "NextGen",
        stock: 10,
        images: ["https://images.unsplash.com/photo-1695642010836-8c9035e4d2a6?q=80&w=800"],
        rating: 4.5
      }
    ];
    await Product.insertMany(dummyProducts);
    res.json({ message: "Database Seeded" });
  } catch (error) {
    res.status(500).json({ message: "Error seeding data", error: error.message });
  }
};

// 4. Create Product
exports.createProduct = async (req, res) => {
  try {
    const { name, price, category, brand, stock, description } = req.body;
    
    // Safety check for files
    if (!req.files || req.files.length < 3 || req.files.length > 5) {
        return res.status(400).json({ message: "Please upload between 3 and 5 images." });
    }

    const imagePaths = req.files.map(file => file.path);

    const product = new Product({
      user: req.user._id,
      name,
      price: Number(price),
      images: imagePaths, 
      brand,
      category,
      description,
      stock: Number(stock),
    });

    const createdProduct = await product.save();
    res.status(201).json(createdProduct);
  } catch (error) {
    console.error("Create Product Error:", error);
    res.status(500).json({ message: "Database Error", error: error.message });
  }
};

// 5. Update Product
exports.updateProduct = async (req, res) => {
  try {
    const { name, price, description, category, brand, stock } = req.body;
    const product = await Product.findById(req.params.id);

    if (product) {
      product.name = name || product.name;
      product.price = price || product.price;
      product.description = description || product.description;
      product.category = category || product.category;
      product.brand = brand || product.brand;
      product.stock = stock || product.stock;

      if (req.files && req.files.length > 0) {
         if (req.files.length < 3 || req.files.length > 5) {
             return res.status(400).json({ message: "Please upload between 3 and 5 images." });
         }
         product.images = req.files.map(file => file.path); 
      }

      const updatedProduct = await product.save();
      res.json(updatedProduct);
    } else {
      res.status(404).json({ message: "Product not found" });
    }
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// 6. Delete Product
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    // Cloudinary Cleanup
    if (product.images && product.images.length > 0) {
        for (const imageUrl of product.images) {
            try {
                const urlParts = imageUrl.split('/');
                const filename = urlParts[urlParts.length - 1];
                const publicId = `azhdaha_products/${filename.split('.')[0]}`;
                await cloudinary.uploader.destroy(publicId);
            } catch (cloudErr) {
                console.error("Failed to delete from Cloudinary:", cloudErr);
            }
        }
    }

    await product.deleteOne(); 
    res.json({ message: "Product and images removed" });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// 7. Create Product Review
exports.createProductReview = async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const product = await Product.findById(req.params.id);

    if (product) {
      if (!product.reviews) product.reviews = [];

      const alreadyReviewed = product.reviews.find(r => r.user.toString() === req.user._id.toString());
      if (alreadyReviewed) return res.status(400).json({ message: 'You have already reviewed this product' });

      const review = { name: req.user.name, rating: Number(rating), comment, user: req.user._id };
      product.reviews.push(review);
      product.numReviews = product.reviews.length;
      product.rating = product.reviews.reduce((acc, item) => item.rating + acc, 0) / product.reviews.length;

      await product.save();
      res.status(201).json({ message: 'Review added successfully' });
    } else {
      res.status(404).json({ message: 'Product not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// 8. Get Recommended Products
exports.getRecommendedProducts = async (req, res) => {
  try {
    const { productId, category } = req.query;
    let recommended;
    if (productId && category) {
      recommended = await Product.find({ category: category, _id: { $ne: productId } }).limit(4);
    } else {
      recommended = await Product.find().sort({ rating: -1 }).limit(4);
    }
    res.json(recommended);
  // } catch (error) {
  //   res.status(500).json({ message: "Server Error", error: error.message });
  // }
  }catch (error) {
    console.log("===============================");
    console.log("🔥 FULL BACKEND CRASH LOG 🔥");
    console.log(error); 
    console.log("===============================");
    res.status(500).json({ 
      message: "Server Error", 
      error: error.message || "Unknown Error",
      details: error
    })}
  
};