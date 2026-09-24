const express = require('express');
const { uploadVideo, getVideos, getVideoById, toggleLike } = require('../controllers/videoController');
const { protect, optionalProtect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

const router = express.Router();

router.get('/', getVideos);

// optionalProtect adds req.user when a token is sent, so the response can include userReaction
router.get('/:id', optionalProtect, getVideoById);

// React to a video: 1 = like, -1 = dislike, sending the same value again removes the reaction
router.post('/:id/like', protect, toggleLike);

// Protected route for uploading videos with multiple files (video + thumbnail)
router.post(
    '/',
    protect,
    upload.fields([
        { name: 'videoFile', maxCount: 1 },
        { name: 'thumbnailFile', maxCount: 1 }
    ]),
    uploadVideo
);

module.exports = router;
