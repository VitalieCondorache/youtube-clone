const Comment = require('../models/Comment');
const Video = require('../models/Video');

// @desc    Add a comment to a video
// @route   POST /api/v1/comments/:videoId
// @access  Private
const addComment = async (req, res) => {
    try {
        const { text } = req.body;
        const { videoId } = req.params;

        if (!text || text.trim() === '') {
            return res.status(400).json({ status: 'fail', message: 'Comment text cannot be empty' });
        }

        // Verify video exists
        const video = await Video.findById(videoId);
        if (!video) {
            return res.status(404).json({ status: 'fail', message: 'Video not found' });
        }

        const comment = await Comment.create({
            text,
            video: videoId,
            author: req.user._id
        });

        // Populate author details before sending response
        await comment.populate('author', 'username avatarUrl');

        res.status(201).json({
            status: 'success',
            data: comment
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};

// @desc    Get all comments for a specific video
// @route   GET /api/v1/comments/:videoId
// @access  Public
const getCommentsByVideoId = async (req, res) => {
    try {
        const { videoId } = req.params;

        const comments = await Comment.find({ video: videoId })
            .populate('author', 'username avatarUrl')
            .sort({ createdAt: -1 });

        res.status(200).json({
            status: 'success',
            results: comments.length,
            data: comments
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};

module.exports = {
    addComment,
    getCommentsByVideoId
};