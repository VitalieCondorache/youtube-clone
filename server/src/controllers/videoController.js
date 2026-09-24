const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs/promises');
const Video = require('../models/Video');
const Like = require('../models/Like');
const Comment = require('../models/Comment');

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

const DEFAULT_PAGE_SIZE = 12;
const MAX_PAGE_SIZE = 50;

// Reads page and limit from the query string, ignoring anything invalid
const getPaging = (req) => {
    const page = Number(req.query.page);
    const limit = Number(req.query.limit);

    const validPage = Number.isInteger(page) && page > 0 ? page : 1;
    const validLimit = Number.isInteger(limit) && limit > 0 ? Math.min(limit, MAX_PAGE_SIZE) : DEFAULT_PAGE_SIZE;

    return { page: validPage, limit: validLimit, skip: (validPage - 1) * validLimit };
};

// @desc    Upload a new video
// @route   POST /api/v1/videos
// @access  Private
const uploadVideo = async (req, res) => {
    try {
        const { title, description } = req.body;

        if (!title || !title.trim()) {
            await removeStoredFiles(req.files);
            return res.status(400).json({ status: 'fail', message: 'A title is required' });
        }

        if (!req.files || !req.files.videoFile || !req.files.thumbnailFile) {
            await removeStoredFiles(req.files);
            return res.status(400).json({ status: 'fail', message: 'Both video file and thumbnail are required' });
        }

        const videoUrl = `/uploads/${req.files.videoFile[0].filename}`;
        const thumbnailUrl = `/uploads/${req.files.thumbnailFile[0].filename}`;

        const video = await Video.create({
            title: title.trim(),
            description: (description || '').trim(),
            videoUrl,
            thumbnailUrl,
            uploader: req.user._id
        });

        res.status(201).json({
            status: 'success',
            data: video
        });
    } catch (error) {
        // multer stores the files before this handler runs, do not leave them behind
        await removeStoredFiles(req.files);
        res.status(500).json({ status: 'error', message: error.message });
    }
};
// @desc    Get one page of the video feed (with their like/dislike counters)
// @route   GET /api/v1/videos?page=1&limit=12
// @access  Public
const getVideos = async (req, res) => {
    try {
        const { page, limit, skip } = getPaging(req);

        const [videos, total] = await Promise.all([
            Video.find({})
                .populate('uploader', 'username avatarUrl')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            Video.countDocuments({})
        ]);

        const likeStats = await getLikeStats(videos.map((video) => video._id));

        const data = videos.map((video) => ({
            ...video.toObject(),
            ...(likeStats.get(String(video._id)) || noStats)
        }));

        res.status(200).json({
            status: 'success',
            results: data.length,
            page,
            limit,
            pages: Math.max(1, Math.ceil(total / limit)),
            total,
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

// @desc    Get the videos uploaded by the current user
// @route   GET /api/v1/videos/mine
// @access  Private
const getMyVideos = async (req, res) => {
    try {
        const videos = await Video.find({ uploader: req.user._id })
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

// @desc    Update the title and the description of one of my videos
// @route   PUT /api/v1/videos/:id
// @access  Private (owner only)
const updateVideo = async (req, res) => {
    try {
        const title = typeof req.body.title === 'string' ? req.body.title.trim() : '';
        const description = typeof req.body.description === 'string' ? req.body.description.trim() : '';

        if (!title) {
            return res.status(400).json({ status: 'fail', message: 'A title is required' });
        }

        if (title.length > 120) {
            return res.status(400).json({ status: 'fail', message: 'The title cannot be longer than 120 characters' });
        }

        if (description.length > 5000) {
            return res.status(400).json({ status: 'fail', message: 'The description cannot be longer than 5000 characters' });
        }

        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(404).json({ status: 'fail', message: 'Video not found' });
        }

        const video = await Video.findById(req.params.id);

        if (!video) {
            return res.status(404).json({ status: 'fail', message: 'Video not found' });
        }

        if (String(video.uploader) !== String(req.user._id)) {
            return res.status(403).json({ status: 'fail', message: 'You can only edit your own videos' });
        }

        video.title = title;
        video.description = description;
        await video.save();

        await video.populate('uploader', 'username avatarUrl');

        const likeStats = (await getLikeStats([video._id])).get(String(video._id)) || noStats;

        res.status(200).json({
            status: 'success',
            data: {
                ...video.toObject(),
                ...likeStats
            }
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};

// Removes the files that multer stored for a request that will not be saved
const removeStoredFiles = async (files) => {
    if (!files) {
        return;
    }

    const urls = Object.values(files)
        .flat()
        .map((file) => `/uploads/${file.filename}`);

    await Promise.all(urls.map(removeUpload));
};

// Removes an uploaded file from disk. A file that is already gone is not an error.
const removeUpload = async (url) => {
    // basename() keeps a crafted url from escaping the uploads folder
    const filename = path.basename(url || '');

    if (!filename) {
        return;
    }

    const filePath = path.join(__dirname, '..', 'uploads', filename);

    try {
        await fs.unlink(filePath);
    } catch (error) {
        if (error.code !== 'ENOENT') {
            console.error(`Could not delete ${filePath}: ${error.message}`);
        }
    }
};

// @desc    Delete one of the videos of the current user (its media, comments and likes too)
// @route   DELETE /api/v1/videos/:id
// @access  Private (owner only)
const deleteVideo = async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(404).json({ status: 'fail', message: 'Video not found' });
        }

        const video = await Video.findById(req.params.id);

        if (!video) {
            return res.status(404).json({ status: 'fail', message: 'Video not found' });
        }

        if (String(video.uploader) !== String(req.user._id)) {
            return res.status(403).json({ status: 'fail', message: 'You can only delete your own videos' });
        }

        // Comments and reactions do not survive their video
        await Promise.all([
            Comment.deleteMany({ video: video._id }),
            Like.deleteMany({ video: video._id })
        ]);

        await video.deleteOne();

        // The media files are secondary, removeUpload never throws
        await Promise.all([removeUpload(video.videoUrl), removeUpload(video.thumbnailUrl)]);

        res.status(200).json({
            status: 'success',
            data: { _id: video._id }
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};

module.exports = {
    uploadVideo,
    getVideos,
    getVideoById,
    getMyVideos,
    toggleLike,
    updateVideo,
    deleteVideo
};

