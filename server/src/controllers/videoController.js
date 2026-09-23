const Video = require('../models/Video');

// @desc    Upload a new video
// @route   POST /api/v1/videos
// @access  Private
const uploadVideo = async (req, res) => {
    try {
        const { title, description } = req.body;

        if (!req.files || !req.files.videoFile || !req.files.thumbnailFile) {
            return res.status(400).json({ status: 'fail', message: 'Both video file and thumbnail are required' });
        }

        const videoUrl = `/uploads/${req.files.videoFile[0].filename}`;
        const thumbnailUrl = `/uploads/${req.files.thumbnailFile[0].filename}`;

        const video = await Video.create({
            title,
            description,
            videoUrl,
            thumbnailUrl,
            uploader: req.user._id
        });

        res.status(201).json({
            status: 'success',
            data: video
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};

// @desc    Get all videos
// @route   GET /api/v1/videos
// @access  Public
const getVideos = async (req, res) => {
    try {
        const videos = await Video.find({})
            .populate('uploader', 'username avatarUrl')
            .sort({ createdAt: -1 });

        res.status(200).json({
            status: 'success',
            results: videos.length,
            data: videos
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};

// @desc    Get single video by ID and increment views
// @route   GET /api/v1/videos/:id
// @access  Public
const getVideoById = async (req, res) => {
    try {
        const video = await Video.findById(req.params.id).populate('uploader', 'username avatarUrl');

        if (!video) {
            return res.status(404).json({ status: 'fail', message: 'Video not found' });
        }

        // Increment view count
        video.views += 1;
        await video.save();

        res.status(200).json({
            status: 'success',
            data: video
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};

module.exports = {
    uploadVideo,
    getVideos,
    getVideoById
};