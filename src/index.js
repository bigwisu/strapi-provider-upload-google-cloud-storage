// src/index.js
'use strict';

const { Storage } = require('@google-cloud/storage');
const slugify = require('slugify');

module.exports = {
  init: (config) => {
    // 1. Receive the configuration
    const {
      bucketName,
      basePath,
      publicPath,
      keyFilename,
      projectId,
      ...rest
    } = config;

    // Validate required config
    if (!bucketName) {
      throw new Error('Bucket name is required');
    }

    // 2. Set up the Google Cloud Storage client
    const storage = new Storage({
      projectId,
      keyFilename,
      ...rest,
    });

    const bucket = storage.bucket(bucketName);

    // 3. Return the provider's interface
    return {
      upload: async (file) => {
        return new Promise((resolve, reject) => {
          const filename = `${basePath}/${slugify(file.hash)}${file.ext}`;
          const fileUpload = bucket.file(filename);

          const stream = fileUpload.createWriteStream({
            metadata: {
              contentType: file.mime,
            },
          });

          stream.on('error', (err) => {
            reject(err);
          });

          stream.on('finish', () => {
            fileUpload.makePublic().then(() => {
              file.url = `${publicPath}/${filename}`;
              resolve();
            });
          });

          stream.end(file.buffer);
        });
      },
      delete: async (file) => {
        const filename = `${basePath}/${slugify(file.hash)}${file.ext}`;
        return bucket.file(filename).delete();
      },
    };
  },
};
