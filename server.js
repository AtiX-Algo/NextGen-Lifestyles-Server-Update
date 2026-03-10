// server/server.js
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const mongoose = require('mongoose');

// Import Routes
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const userRoutes = require('./routes/userRoutes');
const orderRoutes = require('./routes/orderRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const couponRoutes = require('./routes/couponRoutes');

dotenv.config();

const app = express();

// ================= Middleware =================
app.use(express.json());
app.use(cors({
    origin: ['http://localhost:5173', 'https://nextgen-lifestyles-client-update.onrender.com'], 
    credentials: true
}));

// ================= Test Route =================
app.get('/', (req, res) => {
    res.send('🚀 Server is running properly');
});

// ================= Routes =================
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/users', userRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/coupons', couponRoutes);

// ================= MongoDB Connection & Server Start =================
const {
    DB_USERNAME,
    DB_PASSWORD,
    DB_CLUSTER,
    DB_NAME,
    PORT
} = process.env;

// Only start the server IF the database connects successfully
const MONGO_URI = `mongodb+srv://${DB_USERNAME}:${DB_PASSWORD}@${DB_CLUSTER}.mongodb.net/${DB_NAME}?retryWrites=true&w=majority`;

mongoose.connect(MONGO_URI)
    .then(() => {
        console.log('✅ MongoDB Connected');
        const serverPort = PORT || 5000;
        app.listen(serverPort, () => {
            console.log(`🚀 Server running on port ${serverPort}`);
        });
    })
    .catch((err) => {
        console.error('❌ MongoDB Connection Error:', err);
        process.exit(1); // Force the server to stop if DB fails
    });