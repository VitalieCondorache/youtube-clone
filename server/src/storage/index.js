// Storage abstraction: the rest of the API only knows saveFile and removeFile,
// the driver decides where the files end up.
//
//   STORAGE_DRIVER=local   files on disk, served at /uploads   (default)
//   STORAGE_DRIVER=s3      any S3 compatible bucket, see storage/s3.js
const DRIVERS = {
    local: './local',
    s3: './s3'
};

const driverName = (process.env.STORAGE_DRIVER || 'local').toLowerCase();

if (!DRIVERS[driverName]) {
    throw new Error(`Unknown STORAGE_DRIVER "${driverName}", expected one of: ${Object.keys(DRIVERS).join(', ')}`);
}

module.exports = require(DRIVERS[driverName]);
