// server/controllers/orderController.js
const Order = require('../models/Order');
const OrderItem = require('../models/OrderItem'); 
const Product = require('../models/Product');

// 1. Create New Order (Saves to Order AND OrderItem collections)
exports.addOrderItems = async (req, res) => {
  try {
    const { 
      orderItems, 
      shippingAddress, 
      paymentMethod, 
      itemsPrice, 
      shippingPrice, 
      taxPrice, 
      discountAmount, 
      totalPrice 
    } = req.body;

    if (!orderItems || orderItems.length === 0) {
      return res.status(400).json({ message: 'No order items' });
    }

    // 1. Create the base Order
    const order = new Order({
      userId: req.user._id,
      customerName: req.user.name,
      phone: shippingAddress.phone,
      address: shippingAddress.address,
      city: shippingAddress.city,
      location: shippingAddress.location, // Saves Map Coordinates!
      itemsPrice,                         // Saves subtotal
      shippingPrice,                      // Saves shipping
      taxPrice,                           // Saves tax
      discountAmount,                     // Saves voucher/coupon
      totalAmount: totalPrice,
      orderStatus: 'Pending'
    });

    const createdOrder = await order.save();

    // 2. Create the Order Items linked to this Order ID
    const orderItemDocs = orderItems.map(item => ({
        orderId: createdOrder._id,
        productId: item.product,
        productName: item.name,
        quantity: item.quantity,
        price: item.price,
        image: item.image,
        size: item.size // Make sure size saves to OrderItem
    }));

    await OrderItem.insertMany(orderItemDocs);

    res.status(201).json(createdOrder);
  } catch (error) {
    console.error("Error creating order:", error); 
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// 2. Get Order by ID
exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('userId', 'name email');
    const orderItems = await OrderItem.find({ orderId: req.params.id });
    
    if (order) {
      res.json({ ...order.toObject(), orderItems });
    } else {
      res.status(404).json({ message: 'Order not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// 3. Get My Orders (For Customer Dashboard)
exports.getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// 4. Get ALL Orders (For Admin Dashboard)
exports.getOrders = async (req, res) => {
  try {
    const orders = await Order.find({}).sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// 5. Update Status (Admin Manual Verification Flow)
exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body; 
    const order = await Order.findById(req.params.id);

    if (order) {
      order.orderStatus = status;
      const updatedOrder = await order.save();
      res.json(updatedOrder);
    } else {
      res.status(404).json({ message: 'Order not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// 6. Get Admin Analytics
exports.getAdminAnalytics = async (req, res) => {
  try {
    const monthlySales = await Order.aggregate([
      { $match: { orderStatus: { $in: ['Confirmed', 'Delivered'] } } },
      {
        $group: {
          _id: { $month: "$createdAt" },
          totalSales: { $sum: "$totalAmount" },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const formattedSales = monthlySales.map(item => ({
        name: months[item._id - 1],
        sales: item.totalSales,
        orders: item.count
    }));

    const categoryStats = await Product.aggregate([
        { $group: { _id: "$category", value: { $sum: 1 } } }
    ]);
    
    const formattedCategories = categoryStats.map(item => ({
        name: item._id || 'Uncategorized',
        value: item.value
    }));

    res.json({ salesData: formattedSales, categoryData: formattedCategories });
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

// 7. Request Order Return (User)
exports.requestOrderReturn = async (req, res) => {
  try {
    const { reason } = req.body;
    const order = await Order.findById(req.params.id);
    if (order) {
      if (order.orderStatus !== 'Delivered') {
        return res.status(400).json({ message: 'Only delivered orders can be returned' });
      }
      
      order.orderStatus = 'Return_Requested';
      order.returnReason = reason;
      order.returnStatus = 'Pending';
      
      await order.save();
      res.json({ message: 'Return request submitted' });
    } else {
      res.status(404).json({ message: 'Order not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// 8. Handle Return Request (Admin)
exports.handleReturnRequest = async (req, res) => {
  try {
    const { status } = req.body; 
    const order = await Order.findById(req.params.id);
    
    if (order) {
      order.orderStatus = status;
      order.returnStatus = status === 'Returned' ? 'Approved' : 'Rejected';
      
      if (status === 'Returned') {
        const orderItems = await OrderItem.find({ orderId: order._id });
        for (const item of orderItems) {
            const product = await Product.findById(item.productId);
            if (product) {
                product.stock += item.quantity;
                await product.save();
            }
        }
      }
      
      await order.save();
      res.json({ message: `Return ${order.returnStatus}` });
    } else {
      res.status(404).json({ message: 'Order not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// 👈 9. NEW: Update Shipping Charge (Admin)
exports.updateOrderShipping = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (order) {
            const newShipping = Number(req.body.shippingPrice) || 0;
            
            // Re-calculate the grand total so the math is always perfect
            const itemsPrice = order.itemsPrice || 0;
            const taxPrice = order.taxPrice || 0;
            const discount = order.discountAmount || 0;
            
            order.shippingPrice = newShipping;
            order.totalAmount = itemsPrice + taxPrice + newShipping - discount;

            const updatedOrder = await order.save();
            res.json(updatedOrder);
        } else {
            res.status(404).json({ message: "Order not found" });
        }
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};