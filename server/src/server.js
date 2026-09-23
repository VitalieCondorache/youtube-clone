const express = require('express');
const cors = require('cors');
require('dotenv').config();
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');

// Connect to Database
connectDB();

const app = express();

// Middleware
app.use(express.json());
app.use(cors());
app.use('/uploads', express.static('src/uploads'));

// API Routes
app.use('/api/v1/auth', authRoutes);

// Health Check Route
app.get('/api/v1/health', (req, res) => {
    res.status(200).json({ status: 'success', message: 'YouTube Clone API is running' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running in development mode on port ${PORT}`);
});