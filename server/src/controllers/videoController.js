const mongoose = require('mongoose');
const Video = require('../models/Video');
const Like = require('../models/Like');

// Aggregate the likes/dislikes of several videos in a single query
const getLikeStats = async (videoIds) => {
    const counts = await Like.aggregate([
        { $match: { video: { $in: videoIds } } },
        { $group: { _id: { video: '$video', value: '$value' }, count: { $sum: 1 } } }
    ]);

    const stats = new Map();

    counts.forEach(({ _id, count }) => {
        const key = String(_id.video);
        const entry = stats.get(key) || { likesCount: 0, dislikesCount: 0 };

        if (_id.value === 1) {
            entry.likesCount = count;
        } else if (_id.value === -1) {
            entry.dislikesCount = count;
        }

        stats.set(key, entry);
    });

    return stats;
};

const noStats = { likesCount: 0, dislikesCount: 0 };

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

// @desc    Get all videos (with their like/dislike counters)
// @route   GET /api/v1/videos
// @access  Public
const getVideos = async (req, res) => {
    try {
        const videos = await Video.find({})
            .populate('uploader', 'username avatarUrl')
            .sort({ createdAt: -1 });

        const likeStats = await getLikeStats(videos.map((video) => video._id));

        const data = videos.map((video) => ({
            ...video.toObject(),
            ...(likeStats.get(String(video._id)) || noStats)
        }));

        res.status(200).json({
            status: 'success',
            results: data.length,
            data
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};

// @desc    Get single video by ID, increment views and report the reaction of the current user
// @route   GET /api/v1/videos/:id
// @access  Public (optional token)
const getVideoById = async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(404).json({ status: 'fail', message: 'Video not found' });
        }

        const video = await Video.findById(req.params.id).populate('uploader', 'username avatarUrl');

        if (!video) {
            return res.status(404).json({ status: 'fail', message: 'Video not found' });
        }

        // Increment view count
        video.views += 1;
        await video.save();

        const likeStats = (await getLikeStats([video._id])).get(String(video._id)) || noStats;

        let userReaction = null;

        if (req.user) {
            const reaction = await Like.findOne({ video: video._id, user: req.user._id });
            userReaction = reaction ? reaction.value : null;
        }

        res.status(200).json({
            status: 'success',
            data: {
                ...video.toObject(),
                ...likeStats,
                userReaction
            }
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};

// @desc    Add, change or remove the reaction (like/dislike) of the current user
// @route   POST /api/v1/videos/:id/like
// @access  Private
const toggleLike = async (req, res) => {
    try {
        const value = Number(req.body.value);

        if (value !== 1 && value !== -1) {
            return res.status(400).json({ status: 'fail', message: 'Reaction value must be 1 (like) or -1 (dislike)' });
        }

        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(404).json({ status: 'fail', message: 'Video not found' });
        }

        const video = await Video.findById(req.params.id);

        if (!video) {
            return res.status(404).json({ status: 'fail', message: 'Video not found' });
        }

        const existing = await Like.findOne({ video: video._id, user: req.user._id });

        let userReaction = value;

        if (existing && existing.value === value) {
            // Sending the same reaction twice removes it
            await existing.deleteOne();
            userReaction = null;
        } else if (existing) {
            existing.value = value;
            await existing.save();
        } else {
            await Like.create({ video: video._id, user: req.user._id, value });
        }

        const [likesCount, dislikesCount] = await Promise.all([
            Like.countDocuments({ video: video._id, value: 1 }),
            Like.countDocuments({ video: video._id, value: -1 })
        ]);

        res.status(200).json({
            status: 'success',
            data: { likesCount, dislikesCount, userReaction }
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};

module.exports = {
    uploadVideo,
    getVideos,
    getVideoById,
    toggleLike
};
