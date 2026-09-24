const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Reads the user from the "Authorization: Bearer <token>" header.
// Returns null when the header is missing/empty or the token is not valid.
const getUserFromRequest = async (req) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer')) {
        return null;
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
        return null;
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        return await User.findById(decoded.id).select('-password');
    } catch (error) {
        return null;
    }
};

const notAuthorized = (res, message) => res.status(401).json({ status: 'fail', message });

// Block the request when no valid token is provided
const protect = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer') || !authHeader.split(' ')[1]) {
        return notAuthorized(res, 'Not authorized, no token provided');
    }

    const user = await getUserFromRequest(req);

    if (!user) {
        return notAuthorized(res, 'Not authorized, token failed');
    }

    // Attach user object to request (excluding password)
    req.user = user;
    next();
};

// Attach the user when a valid token is present, but never block public routes
const optionalProtect = async (req, res, next) => {
    req.user = await getUserFromRequest(req);
    next();
};

module.exports = { protect, optionalProtect };
