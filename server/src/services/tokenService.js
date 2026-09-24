const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const RefreshToken = require('../models/RefreshToken');

// Access tokens are short lived, refresh tokens last longer and can be revoked
const ACCESS_TOKEN_TTL = process.env.JWT_EXPIRES_IN || '15m';
const REFRESH_TOKEN_DAYS = Number(process.env.REFRESH_TOKEN_DAYS || 30);

const signAccessToken = (userId) => jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: ACCESS_TOKEN_TTL });

// Refresh tokens are random and only their hash is kept in the database
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const issueRefreshToken = async (userId) => {
    const token = crypto.randomBytes(40).toString('hex');
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000);

    await RefreshToken.create({ user: userId, tokenHash: hashToken(token), expiresAt });

    return token;
};

// A fresh pair for a successful login or registration
const issueTokenPair = async (userId) => ({
    accessToken: signAccessToken(userId),
    refreshToken: await issueRefreshToken(userId)
});

// Returns a new pair, or null when the token is unknown or expired.
// The used token is deleted, so a leaked one cannot be replayed.
const rotateRefreshToken = async (token) => {
    const stored = await RefreshToken.findOne({ tokenHash: hashToken(token) });

    if (!stored) {
        return null;
    }

    await stored.deleteOne();

    if (stored.expiresAt.getTime() <= Date.now()) {
        return null;
    }

    return {
        userId: stored.user,
        ...(await issueTokenPair(stored.user))
    };
};

const revokeRefreshToken = async (token) => {
    if (!token) {
        return;
    }

    await RefreshToken.deleteOne({ tokenHash: hashToken(token) });
};

// Used when every session of a user has to end at once
const revokeAllRefreshTokens = async (userId) => {
    await RefreshToken.deleteMany({ user: userId });
};

module.exports = {
    issueTokenPair,
    rotateRefreshToken,
    revokeRefreshToken,
    revokeAllRefreshTokens
};
