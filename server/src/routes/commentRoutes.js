const express = require('express');
const { addComment, getCommentsByVideoId } = require('../controllers/commentController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/:videoId', getCommentsByVideoId);
router.post('/:videoId', protect, addComment);

module.exports = router;