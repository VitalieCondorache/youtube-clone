const multer = require('multer');

// The files are buffered in memory, capped by the limit below, so the controller can
// hand them to whichever storage driver is configured: local disk or an S3 bucket
const storage = multer.memoryStorage();

// Validation errors carry a status so the API can answer with JSON instead of an HTML stack
const validationError = (message) => {
    const error = new Error(message);
    error.status = 400;
    return error;
};

// File filter to allow only videos and images
const fileFilter = (req, file, cb) => {
    if (file.fieldname === 'videoFile') {
        if (file.mimetype.startsWith('video/')) {
            cb(null, true);
        } else {
            cb(validationError('Only video files are allowed'), false);
        }
    } else if (file.fieldname === 'thumbnailFile') {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(validationError('Only image files are allowed for the thumbnail'), false);
        }
    } else {
        cb(validationError(`Unexpected file field: ${file.fieldname}`), false);
    }
};

const upload = multer({
    storage,
    limits: { fileSize: 100 * 1024 * 1024 }, // limit each file to 100MB
    fileFilter
});

module.exports = upload;