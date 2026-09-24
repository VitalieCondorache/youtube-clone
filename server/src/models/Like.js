const mongoose = require('mongoose');

const likeSchema = new mongoose.Schema({
    video: { type: mongoose.Schema.Types.ObjectId, ref: 'Video', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // 1 = like, -1 = dislike
    value: { type: Number, enum: [1, -1], required: true }
}, { timestamps: true });

// A user can only have a single reaction per video
likeSchema.index({ video: 1, user: 1 }, { unique: true });

module.exports = mongoose.model('Like', likeSchema);
