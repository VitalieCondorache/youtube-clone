const { test } = require('node:test');
const assert = require('node:assert/strict');

const STORAGE_MODULE = require.resolve('../src/storage');

// The driver is picked from the environment the first time the module is required,
// so each case discards the cached copy to get a clean load.
const loadStorage = () => {
    delete require.cache[STORAGE_MODULE];
    return require(STORAGE_MODULE);
};

test('falls back to the local driver', () => {
    delete process.env.STORAGE_DRIVER;

    assert.equal(loadStorage().driver, 'local');
});

test('honours STORAGE_DRIVER=s3', () => {
    process.env.STORAGE_DRIVER = 's3';

    assert.equal(loadStorage().driver, 's3');
});

test('fails fast on an unknown driver', () => {
    process.env.STORAGE_DRIVER = 'ftp';

    assert.throws(loadStorage, /Unknown STORAGE_DRIVER/);
});
