const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const videoRoutes = require('./routes/videoRoutes');
const commentRoutes = require('./routes/commentRoutes');

// Connect to Database
connectDB();

const app = express();

// Middleware
app.use(express.json());

// CORS Configuration - More Permissive for Development
const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests from localhost origins (development)
        if (!origin || origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    optionsSuccessStatus: 200 // Some legacy browsers (IE11, various SmartTVs) choke on 204
};

app.use(cors(corsOptions));
// Serve uploaded files using an absolute path so it works regardless of the cwd
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes - Make sure we're not applying any middleware globally that would affect public routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/videos', videoRoutes);
app.use('/api/v1/comments', commentRoutes);

// Health Check Route
app.get('/api/v1/health', (req, res) => {
    res.status(200).json({ status: 'success', message: 'YouTube Clone API is running' });
});

const PORT = process.env.PORT || 5001;
const server = app.listen(PORT, () => {
    console.log(`Server running in development mode on port ${PORT}`);
});

// Fail loudly instead of silently doing nothing when the port is taken.
// On macOS port 5000 is occupied by the AirPlay Receiver (ControlCenter),
// which answers requests with an empty 403 Forbidden.
server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
        console.error(
            `Port ${PORT} is already in use. On macOS port 5000 belongs to the AirPlay Receiver. ` +
            `Set PORT in server/.env to a free port and update client/proxy.conf.json to match.`
        );
    } else {
        console.error('Server error:', error);
    }
    process.exit(1);
});