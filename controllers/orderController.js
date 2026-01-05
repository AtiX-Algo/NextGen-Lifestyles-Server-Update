// server/controllers/orderController.js
const Order = require('../models/Order');
const Product = require('../models/Product');
const Stripe = require('stripe');
const stripe = Stripe('sk_test_YOUR_STRIPE_KEY_HERE'); 
const sendSMS = require('../utils/smsService'); 

// 1. Create New Order
exports.addOrderItems = async (req, res) => {
  try {
    const { orderItems, shippingAddress, paymentMethod, itemsPrice, taxPrice, shippingPrice, totalPrice } = req.body;

    if (!orderItems || orderItems.length === 0) {
      return res.status(400).json({ message: 'No order items' });
    }

    const order = new Order({
      user: req.user._id, 
      orderItems,
      shippingAddress,
      paymentMethod,
      itemsPrice,
      taxPrice,
      shippingPrice,
      totalPrice
    });

    const createdOrder = await order.save();

    // 📲 SMS NOTIFICATION: Order Placed
    if (shippingAddress.phone) {
        const msg = `Hi ${req.user.name}, your order #${createdOrder._id.toString().slice(-6)} has been placed successfully! Total: $${totalPrice}`;
        sendSMS(shippingAddress.phone, msg);
    }

    res.status(201).json(createdOrder);
  } catch (error) {
    console.error("Error creating order:", error); 
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// 2. Get Order by ID
exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('user', 'name email');
    if (order) {
      res.json(order);
    } else {
      res.status(404).json({ message: 'Order not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// 3. Update Order to Paid
exports.updateOrderToPaid = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (order) {
      order.isPaid = true;
      order.paidAt = Date.now();

      order.paymentResult = {
        id: req.body.id || 'mock_payment_id',
        status: req.body.status || 'success',
        email_address: req.body.email_address || req.user.email
      };

      const updatedOrder = await order.save();
      res.json(updatedOrder);
    } else {
      res.status(404).json({ message: 'Order not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// 4. Get My Orders
exports.getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// 5. Get ALL Orders (Admin)
exports.getOrders = async (req, res) => {
  try {
    const orders = await Order.find({}).populate('user', 'id name');
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// 6. Update Order to Delivered (Admin Manual)
exports.updateOrderToDelivered = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (order) {
      order.isDelivered = true;
      order.deliveredAt = Date.now();
      order.status = 'Delivered';
      const updatedOrder = await order.save();
      res.json(updatedOrder);
    } else {
      res.status(404).json({ message: 'Order not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// 7. Assign Delivery Man (Admin)
exports.assignDeliveryMan = async (req, res) => {
  try {
    const { deliveryManId } = req.body;
    const order = await Order.findById(req.params.id);

    if (order) {
      order.deliveryMan = deliveryManId;
      order.status = 'Shipped'; 
      await order.save();

      // 📲 SMS NOTIFICATION: Order Shipped
      if (order.shippingAddress && order.shippingAddress.phone) {
          const msg = `Good news! Order #${order._id.toString().slice(-6)} has been SHIPPED. A delivery partner has been assigned.`;
          sendSMS(order.shippingAddress.phone, msg);
      }

      res.json(order);
    } else {
      res.status(404).json({ message: 'Order not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// 8. Get Orders for Logged-in Delivery Man
exports.getDeliveryManOrders = async (req, res) => {
  try {
    const orders = await Order.find({ deliveryMan: req.user._id }).populate('user', 'name phone');
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// 9. Update Status (Delivery Man Only)
exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body; 
    const order = await Order.findById(req.params.id);

    if (order) {
      order.status = status;
      if (status === 'Delivered') {
        order.isDelivered = true;
        order.deliveredAt = Date.now();
      }
      
      const updatedOrder = await order.save();

      // 📲 SMS NOTIFICATION: Status Update
      if (order.shippingAddress && order.shippingAddress.phone) {
          let msg = '';
          if (status === 'Out_for_Delivery') {
              msg = `Order #${order._id.toString().slice(-6)} is OUT FOR DELIVERY.`;
          } else if (status === 'Delivered') {
              msg = `Order #${order._id.toString().slice(-6)} has been DELIVERED.`;
          }

          if (msg) sendSMS(order.shippingAddress.phone, msg);
      }

      res.json(updatedOrder);
    } else {
      res.status(404).json({ message: 'Order not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// 10. Get Admin Analytics
exports.getAdminAnalytics = async (req, res) => {
  try {
    const monthlySales = await Order.aggregate([
      { $match: { isPaid: true } },
      {
        $group: {
          _id: { $month: "$createdAt" },
          totalSales: { $sum: "$totalPrice" },
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

// 11. Request Order Return (User)
exports.requestOrderReturn = async (req, res) => {
  try {
    const { reason } = req.body;
    const order = await Order.findById(req.params.id);
    if (order) {
      if (order.status !== 'Delivered') {
        return res.status(400).json({ message: 'Only delivered orders can be returned' });
      }
      
      order.status = 'Return_Requested';
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

// 12. Handle Return Request (Admin)
exports.handleReturnRequest = async (req, res) => {
  try {
    const { status } = req.body; // 'Returned' or 'Return_Rejected'
    const order = await Order.findById(req.params.id);
    if (order) {
      order.status = status;
      order.returnStatus = status === 'Returned' ? 'Approved' : 'Rejected';
      
      // ✅ If approved, add stock back to products
      if (status === 'Returned') {
        for (const item of order.orderItems) {
            const product = await Product.findById(item.product);
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