// server/server.js
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const mongoose = require('mongoose');
const http = require('http'); // 1. Import HTTP
const { Server } = require('socket.io'); // 2. Import Socket.io
const path = require('path'); // ✅ Import path
const fs = require('fs'); // ✅ Import fs (to check/create uploads folder)

// Import Routes
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const userRoutes = require('./routes/userRoutes');
const orderRoutes = require('./routes/orderRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const couponRoutes = require('./routes/couponRoutes');

dotenv.config();

const app = express();

// ============================================
// 3. SERVER & SOCKET SETUP
// ============================================
// Create the HTTP server using the Express app
const server = http.createServer(app); 

// Initialize Socket.io with CORS (Must match your Frontend URL)
const io = new Server(server, {
  cors: {
    origin: [ 'http://localhost:5173','https://nextgen-lifestyles-client-update.onrender.com'], // Vite frontend
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Store io in app so we can use it in controllers (e.g., req.app.get('socketio'))
app.set('socketio', io);

// Define a shared support room
const SUPPORT_ROOM = "live_support";

// ================= Middleware =================
app.use(express.json());
app.use(cors({
    origin: [ 'http://localhost:5173','https://nextgen-lifestyles-client-update.onrender.com'], // Vite frontend
    credentials: true
}));

// ================= ✅ Static Files (Uploads) =================
// Define the path to the uploads folder
const uploadsDir = path.join(__dirname, 'uploads');

// Create uploads folder if it doesn't exist (prevents crashes if folder is missing)
if (!fs.existsSync(uploadsDir)){
    fs.mkdirSync(uploadsDir);
    console.log('📁 Created uploads directory');
}

// Make the 'uploads' folder static (Accessible via http://localhost:5000/uploads/filename.jpg)
app.use('/uploads', express.static(uploadsDir));

// ================= Socket.io Logic =================
io.on('connection', (socket) => {
    console.log('⚡ User Connected:', socket.id);
  
    // User joins a room based on their User ID (for general notifications)
    socket.on('join_room', (userId) => {
      if(userId) {
          socket.join(userId);
          console.log(`👤 User ${userId} joined room`);
      }
    });
    
    // User joins a private chat room
    socket.on('join_private_chat', (userId) => {
        if(userId) {
            socket.join(userId);
            console.log(`💬 User joined private chat room: ${userId}`);
        }
    });

    // User joins the shared support room
    socket.on('join_support_chat', (userId) => {
        socket.join(SUPPORT_ROOM);
        console.log(`💬 User ${userId || 'Anonymous'} joined support room`);
        
        // Notify all in support room that someone joined (optional)
        io.to(SUPPORT_ROOM).emit('user_joined_support', {
            userId: userId || 'Anonymous',
            timestamp: new Date(),
            message: 'A user has joined the support chat'
        });
    });

    // Handle incoming private messages
    socket.on('send_private_message', async (data) => {
        const { senderId, receiverId, message } = data;
        
        // In a real app, you'd save to DB here:
        // const Chat = require('./models/Chat');
        // await Chat.create({ sender: senderId, receiver: receiverId, message });
        
        console.log(`📩 Private message from ${senderId} to ${receiverId}: ${message}`);
        
        // Emit to the specific receiver's room
        io.to(receiverId).emit('receive_private_message', {
            senderId,
            message,
            timestamp: new Date()
        });
        
        // Optional: Also send back to sender for confirmation
        socket.emit('private_message_sent', {
            receiverId,
            message,
            timestamp: new Date()
        });
    });
    
    // Handle incoming support messages
    socket.on('send_support_message', async (data) => {
        const { senderId, senderName, message } = data;

        console.log(`📩 Support message from ${senderId} (${senderName}): ${message}`);

        // Emit to all users in the support room
        io.to(SUPPORT_ROOM).emit('receive_support_message', {
            senderId,
            senderName: senderName || 'Anonymous',
            message,
            timestamp: new Date()
        });

        // Optional: Also send back to sender for confirmation
        socket.emit('support_message_sent', {
            message,
            timestamp: new Date()
        });
    });

    // Admin sends message to support room
    socket.on('admin_support_message', async (data) => {
        const { adminId, adminName, message } = data;

        console.log(`🛠️ Admin message from ${adminId} (${adminName}): ${message}`);

        // Emit to all users in the support room
        io.to(SUPPORT_ROOM).emit('receive_support_message', {
            senderId: adminId,
            senderName: adminName || 'Support Agent',
            message,
            isAdmin: true,
            timestamp: new Date()
        });
    });
    
    // Handle typing indicator for private chat
    socket.on('typing', (data) => {
        const { senderId, receiverId, isTyping } = data;
        io.to(receiverId).emit('user_typing', {
            senderId,
            isTyping
        });
    });
    
    // Handle typing indicator for support chat
    socket.on('support_typing', (data) => {
        const { senderId, isTyping } = data;
        socket.to(SUPPORT_ROOM).emit('support_user_typing', {
            senderId,
            isTyping
        });
    });
    
    // Handle message read status
    socket.on('mark_as_read', (data) => {
        const { senderId, receiverId, messageId } = data;
        io.to(senderId).emit('message_read', {
            receiverId,
            messageId,
            readAt: new Date()
        });
    });

    // User leaves support room
    socket.on('leave_support_chat', (userId) => {
        socket.leave(SUPPORT_ROOM);
        console.log(`👋 User ${userId || 'Anonymous'} left support room`);
        
        // Notify all in support room that someone left (optional)
        io.to(SUPPORT_ROOM).emit('user_left_support', {
            userId: userId || 'Anonymous',
            timestamp: new Date()
        });
    });

    socket.on('disconnect', () => {
      console.log('❌ User Disconnected', socket.id);
    });
});

// ================= Test Route =================
app.get('/', (req, res) => {
    res.send('🚀 Server is running properly');
});

// ================= MongoDB Connection =================
const {
    DB_USERNAME,
    DB_PASSWORD,
    DB_CLUSTER,
    DB_NAME
} = process.env;

const MONGO_URI = `mongodb+srv://${DB_USERNAME}:${DB_PASSWORD}@${DB_CLUSTER}.mongodb.net/${DB_NAME}?retryWrites=true&w=majority`;

mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ MongoDB Connected'))
    .catch((err) => console.error('❌ MongoDB Connection Error:', err));

// ================= Routes =================
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/users', userRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/coupons', couponRoutes);

// ================= Start Server =================
const PORT = process.env.PORT || 5000;

// IMPORTANT: Listen on 'server', not 'app' to enable Socket.io
server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`💬 Socket.io is ready for real-time chat`);
    console.log(`🆘 Live support room available: ${SUPPORT_ROOM}`);
});