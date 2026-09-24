// Sends the files to any S3 compatible bucket: AWS S3, Cloudflare R2, Backblaze B2,
// DigitalOcean Spaces or a local MinIO. Configured through the S3_* variables.
const BUCKET = process.env.S3_BUCKET;
const REGION = process.env.S3_REGION || 'auto';
const ENDPOINT = process.env.S3_ENDPOINT;
const PUBLIC_BASE_URL = (process.env.S3_PUBLIC_BASE_URL || '').replace(/\/+$/, '');
const PREFIX = (process.env.S3_PREFIX || 'uploads').replace(/^\/+|\/+$/g, '');

let client = null;

// The client is created on first use and fails with a readable message when the
// configuration is incomplete, instead of crashing at import time.
const getClient = () => {
    if (!BUCKET) {
        throw new Error('STORAGE_DRIVER=s3 needs S3_BUCKET to be set');
    }

    if (!PUBLIC_BASE_URL) {
        throw new Error('STORAGE_DRIVER=s3 needs S3_PUBLIC_BASE_URL (the public or CDN url of the bucket)');
    }

    if (!client) {
        const { S3Client } = require('@aws-sdk/client-s3');

        client = new S3Client({
            region: REGION,
            // services such as R2 and MinIO need an explicit endpoint and path style addressing
            endpoint: ENDPOINT,
            forcePathStyle: Boolean(ENDPOINT),
            // without explicit keys the sdk falls back to AWS_ACCESS_KEY_ID and the instance role
            credentials: process.env.S3_ACCESS_KEY_ID
                ? {
                      accessKeyId: process.env.S3_ACCESS_KEY_ID,
                      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY
                  }
                : undefined
        });
    }

    return client;
};

const saveFile = async ({ filename, buffer, mimetype }) => {
    const { PutObjectCommand } = require('@aws-sdk/client-s3');
    const key = `${PREFIX}/${filename}`;

    await getClient().send(
        new PutObjectCommand({
            Bucket: BUCKET,
            Key: key,
            Body: buffer,
            ContentType: mimetype
        })
    );

    return `${PUBLIC_BASE_URL}/${key}`;
};

// Turns a stored url back into the object key
const toKey = (url) => {
    if (!url) {
        return null;
    }

    if (PUBLIC_BASE_URL && url.startsWith(`${PUBLIC_BASE_URL}/`)) {
        return url.slice(PUBLIC_BASE_URL.length + 1);
    }

    try {
        return new URL(url).pathname.replace(/^\/+/, '');
    } catch (error) {
        return null;
    }
};

// Deleting a key that does not exist is not an error for S3
const removeFile = async (url) => {
    const { DeleteObjectCommand } = require('@aws-sdk/client-s3');
    const key = toKey(url);

    if (!key) {
        return;
    }

    try {
        await getClient().send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
    } catch (error) {
        console.error(`Could not delete ${key} from ${BUCKET}: ${error.message}`);
    }
};

module.exports = {
    driver: 's3',
    saveFile,
    removeFile
};
