const multer = require('multer');
const path = require('path');

// Configure storage destination and filename
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'src/uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

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
    storage: storage,
    limits: { fileSize: 100 * 1024 * 1024 }, // Limit file size to 100MB
    fileFilter: fileFilter
});

module.exports = upload;