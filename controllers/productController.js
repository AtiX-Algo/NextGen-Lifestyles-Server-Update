// server/controllers/productController.js
const Product = require('../models/Product');
const User = require('../models/User'); // ✅ Added: Needed to find Admin for seeding

// 1. Get All Products (with Search & Filter)
exports.getProducts = async (req, res) => {
  try {
    const { keyword, category, minPrice, maxPrice } = req.query;
    
    // Build Query
    let query = {};

    // Search by Name (Case insensitive regex)
    if (keyword) {
      query.name = { $regex: keyword, $options: 'i' };
    }

    // Filter by Category
    if (category) {
      query.category = category;
    }

    // Filter by Price Range
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    const products = await Product.find(query);
    res.status(200).json(products);
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

// 3. Seed Database (Run this once to add dummy data)
exports.seedProducts = async (req, res) => {
  try {
    await Product.deleteMany(); // Clear existing

    // ✅ FIX: Find an admin user to own the dummy products
    const adminUser = await User.findOne({ role: 'admin' });
    
    // Safety check: ensure an admin exists
    if (!adminUser) {
        return res.status(400).json({ message: "Please create an Admin user in the database first before seeding." });
    }

    const dummyProducts = [
      {
        user: adminUser._id, // ✅ FIX: Assign Owner
        name: "Wireless Headphones",
        description: "High quality noise cancelling headphones.",
        price: 99.99,
        category: "Electronics",
        brand: "Sony",
        stock: 10,
        images: ["https://placehold.co/400"],
        colors: ["Black", "White"],
        sizes: [],
        rating: 4.5
      },
      {
        user: adminUser._id, // ✅ FIX: Assign Owner
        name: "Running Shoes",
        description: "Lightweight running shoes for daily use.",
        price: 59.99,
        category: "Fashion",
        brand: "Nike",
        stock: 5,
        images: ["https://placehold.co/400"],
        colors: ["Red", "Blue"],
        sizes: ["8", "9", "10"],
        rating: 4.0
      },
      {
        user: adminUser._id, // ✅ FIX: Assign Owner
        name: "Gaming Mouse",
        description: "RGB gaming mouse with high DPI.",
        price: 29.99,
        category: "Electronics",
        brand: "Logitech",
        stock: 0, // Out of stock test
        images: ["https://placehold.co/400"],
        colors: ["Black"],
        sizes: [],
        rating: 4.8
      }
    ];
    await Product.insertMany(dummyProducts);
    res.json({ message: "Database Seeded with Valid Products (Owner Assigned)" });
  } catch (error) {
    res.status(500).json({ message: "Error seeding data", error: error.message });
  }
};

// 4. Create Product (Updated)
exports.createProduct = async (req, res) => {
  try {
    const { name, price, category, brand, stock, description } = req.body;
    
    // Check if file was uploaded
    let imagePath = '';
    if (req.file) {
      // Convert Windows path backslashes to forward slashes if needed
      imagePath = `/uploads/${req.file.filename}`; 
    }

    const product = new Product({
      user: req.user._id,
      name,
      price,
      image: imagePath, // Save the path
      brand,
      category,
      description,
      stock,
    });

    const createdProduct = await product.save();
    res.status(201).json(createdProduct);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// 5. Update Product (Updated)
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

      // Only update image if a new file is uploaded
      if (req.file) {
        product.image = `/uploads/${req.file.filename}`;
      }

      const updatedProduct = await product.save();
      res.json(updatedProduct);
    } else {
      res.status(404).json({ message: "Product not found" });
    }
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

// 6. Delete Product (Admin)
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    await product.deleteOne(); 
    res.json({ message: "Product removed" });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// 7. Create Product Review
exports.createProductReview = async (req, res) => {
  try {
    const { rating, comment } = req.body;
    
    // 🔍 Log incoming data
    console.log(`📝 Adding Review: User=[${req.user.name}] Product=[${req.params.id}] Rating=[${rating}]`);

    const product = await Product.findById(req.params.id);

    if (product) {
      // 🛡️ Safety Check: Ensure reviews array exists
      if (!product.reviews) {
          product.reviews = [];
      }

      // 1. Check if already reviewed
      const alreadyReviewed = product.reviews.find(
        (r) => r.user.toString() === req.user._id.toString()
      );

      if (alreadyReviewed) {
        return res.status(400).json({ message: 'You have already reviewed this product' });
      }

      // 2. Create Review Object
      const review = {
        name: req.user.name,
        rating: Number(rating),
        comment,
        user: req.user._id,
      };

      // 3. Push and Save
      product.reviews.push(review);

      // 4. Update Stats
      product.numReviews = product.reviews.length;
      product.rating =
        product.reviews.reduce((acc, item) => item.rating + acc, 0) /
        product.reviews.length;

      await product.save();
      
      console.log("✅ Review Saved Successfully");
      res.status(201).json({ message: 'Review added successfully' });
    } else {
      res.status(404).json({ message: 'Product not found' });
    }
  } catch (error) {
    console.error("🔥 Review Error:", error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// 8. Get Recommended Products
exports.getRecommendedProducts = async (req, res) => {
  try {
    const { productId, category } = req.query;

    let recommended;

    if (productId && category) {
      // Logic: Find 4 products in the same category, excluding the current product
      recommended = await Product.find({
        category: category,
        _id: { $ne: productId } 
      }).limit(4);
    } else {
      // Logic: If no category, just show top 4 highest rated products (Trending)
      recommended = await Product.find().sort({ rating: -1 }).limit(4);
    }

    res.json(recommended);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};