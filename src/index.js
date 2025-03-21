// src/index.js
'use strict';

const provider = require('./server/provider');

module.exports = {
  init: (config) => {
    // Initialize the provider with the configuration
    const initializedProvider = provider.init(strapi)(config);

    // Return the provider's interface, including uploadStream
    return {
      upload: initializedProvider.upload,
      uploadStream: initializedProvider.uploadStream, // Explicitly return uploadStream
      delete: initializedProvider.delete,
      isPrivate: initializedProvider.isPrivate,
      getSignedUrl: initializedProvider.getSignedUrl,
    };
  },
};
