const path = require('path');
const fs = require('fs/promises');

// Keeps the uploaded files on the machine that runs the API, under server/src/uploads,
// where express.static serves them at /uploads
const uploadsDir = path.join(__dirname, '..', 'uploads');

const saveFile = async ({ filename, buffer }) => {
    await fs.writeFile(path.join(uploadsDir, filename), buffer);

    return `/uploads/${filename}`;
};

// Removes a /uploads/<file> url. A file that is already gone is not an error.
const removeFile = async (url) => {
    // basename() keeps a crafted url from escaping the uploads folder
    const filename = path.basename(url || '');

    if (!filename) {
        return;
    }

    try {
        await fs.unlink(path.join(uploadsDir, filename));
    } catch (error) {
        if (error.code !== 'ENOENT') {
            console.error(`Could not delete ${filename}: ${error.message}`);
        }
    }
};

module.exports = {
    driver: 'local',
    saveFile,
    removeFile
};
