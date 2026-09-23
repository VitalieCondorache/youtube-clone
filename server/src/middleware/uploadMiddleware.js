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

// File filter to allow only videos and images
const fileFilter = (req, file, cb) => {
    if (file.fieldname === 'videoFile') {
        if (file.mimetype.startsWith('video/')) {
            cb(null, true);
        } else {
            cb(new Error('Only video files are allowed!'), false);
        }
    } else if (file.fieldname === 'thumbnailFile') {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed for thumbnails!'), false);
        }
    } else {
        cb(new Error('Unexpected field'), false);
    }
};

const upload = multer({
    storage: storage,
    limits: { fileSize: 100 * 1024 * 1024 }, // Limit file size to 100MB
    fileFilter: fileFilter
});

module.exports = upload;