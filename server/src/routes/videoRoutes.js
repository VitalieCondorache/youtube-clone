const express = require('express');
const {
    uploadVideo,
    getVideos,
    getVideoById,
    getMyVideos,
    toggleLike,
    deleteVideo
} = require('../controllers/videoController');
const { protect, optionalProtect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

const router = express.Router();

router.get('/', getVideos);

// Videos of the current user, must stay above /:id so it is not read as an id
router.get('/mine', protect, getMyVideos);

// optionalProtect adds req.user when a token is sent, so the response can include userReaction
router.get('/:id', optionalProtect, getVideoById);

// React to a video: 1 = like, -1 = dislike, sending the same value again removes the reaction
router.post('/:id/like', protect, toggleLike);

// Delete a video (only its uploader)
router.delete('/:id', protect, deleteVideo);

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
