const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Generate JWT token helper
const generateToken = (userId) => {
    return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

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

        if (user) {
            res.status(201).json({
                status: 'success',
                data: {
                    _id: user._id,
                    username: user.username,
                    email: user.email,
                    token: generateToken(user._id)
                }
            });
        } else {
            res.status(400).json({ status: 'fail', message: 'Invalid user data provided' });
        }
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
                token: generateToken(user._id)
            }
        });
    } catch (error) {
        console.error('Login error:', error); // Add logging
        res.status(500).json({ status: 'error', message: error.message });
    }
};

module.exports = {
    registerUser,
    loginUser
};