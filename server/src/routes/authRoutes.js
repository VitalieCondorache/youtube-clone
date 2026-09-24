const express = require('express');
const { registerUser, loginUser, refreshTokens, logoutUser } = require('../controllers/authController');

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/refresh', refreshTokens);
router.post('/logout', logoutUser);

module.exports = router;