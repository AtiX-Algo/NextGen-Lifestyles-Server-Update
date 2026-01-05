const Coupon = require('../models/Coupon');

// 1. Create Coupon (Admin)
exports.createCoupon = async (req, res) => {
  try {
    const { code, description, discountPercentage, minPurchaseAmount,maxPurchaseAmount, expirationDate } = req.body;

    const existingCoupon = await Coupon.findOne({ code });
    if (existingCoupon) {
      return res.status(400).json({ message: "Coupon code already exists" });
    }

    const coupon = new Coupon({
      code,
      description,
      discountPercentage,
      minPurchaseAmount,
      maxPurchaseAmount,
      expirationDate
    });

    await coupon.save();
    res.status(201).json({ message: "Coupon Created", coupon });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// 2. Get All Coupons (Public or Admin)
exports.getAllCoupons = async (req, res) => {
  try {
    const coupons = await Coupon.find({}).sort({ createdAt: -1 });
    res.json(coupons);
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

// 3. Delete Coupon (Admin)
exports.deleteCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) return res.status(404).json({ message: "Coupon not found" });

    await coupon.deleteOne();
    res.json({ message: "Coupon Deleted" });
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

// 4. Validate Coupon (User at Checkout)
exports.validateCoupon = async (req, res) => {
  try {
    const { code, cartTotal } = req.body;
    
    const coupon = await Coupon.findOne({ code: code.toUpperCase() });

    if (!coupon) {
      return res.status(404).json({ message: "Invalid Coupon Code" });
    }

    if (new Date() > coupon.expirationDate) {
      return res.status(400).json({ message: "Coupon has expired" });
    }

    if (cartTotal < coupon.minPurchaseAmount) {
        return res.status(400).json({ 
            message: `Minimum purchase amount of $${coupon.minPurchaseAmount} required` 
        });
    }

    if (cartTotal > coupon.maxPurchaseAmount) {
        return res.status(400).json({ 
            message: `Maximum purchase amount of $${coupon.maxPurchaseAmount} required` 
        });
    }

    res.json({
      message: "Coupon Applied",
      discountPercentage: coupon.discountPercentage,
      code: coupon.code
    });

  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};