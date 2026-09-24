const User = require('../models/User');
const bcrypt = require('bcryptjs');
const { issueTokenPair, rotateRefreshToken, revokeRefreshToken } = require('../services/tokenService');

// @desc    Register a new user
// @route   POST /api/v1/auth/register
// @access  Public
const registerUser = async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            return res.status(400).json({ status: 'fail', message: 'Email or username already in use' });
        }

        // Hash password securely
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create new user in database
        const user = await User.create({
            username,
            email,
            password: hashedPassword
        });

        if (!user) {
            return res.status(400).json({ status: 'fail', message: 'Invalid user data provided' });
        }

        res.status(201).json({
            status: 'success',
            data: {
                _id: user._id,
                username: user.username,
                email: user.email,
                ...(await issueTokenPair(user._id))
            }
        });
    } catch (error) {
        console.error('Registration error:', error); // Add logging
        res.status(500).json({ status: 'error', message: error.message });
    }
};

// @desc    Authenticate user & get token
// @route   POST /api/v1/auth/login
// @access  Public
const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user by email
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ status: 'fail', message: 'Invalid email or password' });
        }

        // Compare submitted password with hashed password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ status: 'fail', message: 'Invalid email or password' });
        }

        res.status(200).json({
            status: 'success',
            data: {
                _id: user._id,
                username: user.username,
                email: user.email,
                ...(await issueTokenPair(user._id))
            }
        });
    } catch (error) {
        console.error('Login error:', error); // Add logging
        res.status(500).json({ status: 'error', message: error.message });
    }
};

// @desc    Exchange a refresh token for a new token pair (the old one is rotated out)
// @route   POST /api/v1/auth/refresh
// @access  Public (the refresh token itself is the proof)
const refreshTokens = async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(400).json({ status: 'fail', message: 'A refresh token is required' });
        }

        const rotated = await rotateRefreshToken(refreshToken);

        if (!rotated) {
            return res.status(401).json({ status: 'fail', message: 'The session has expired, please sign in again' });
        }

        const user = await User.findById(rotated.userId);

        if (!user) {
            return res.status(401).json({ status: 'fail', message: 'This account no longer exists' });
        }

        res.status(200).json({
            status: 'success',
            data: {
                _id: user._id,
                username: user.username,
                email: user.email,
                accessToken: rotated.accessToken,
                refreshToken: rotated.refreshToken
            }
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};

// @desc    End the session that owns the given refresh token
// @route   POST /api/v1/auth/logout
// @access  Public (the refresh token itself is the proof)
const logoutUser = async (req, res) => {
    try {
        await revokeRefreshToken(req.body.refreshToken);

        res.status(200).json({ status: 'success', data: {} });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};

module.exports = {
    registerUser,
    loginUser,
    refreshTokens,
    logoutUser
};