const express = require('express');
const { uploadVideo, getVideos, getVideoById } = require('../controllers/videoController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

const router = express.Router();

router.get('/', getVideos);
router.get('/:id', getVideoById);

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