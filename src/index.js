'use strict';

const provider = require('./server/provider');

module.exports = {
  register: ({ strapi }) => {
    strapi.log.info('Registering Google Cloud Storage upload provider');
  },
  bootstrap: ({ strapi }) => {
    strapi.log.info('Bootstrapping Google Cloud Storage upload provider');
  },
  config: {
    default: require('./config'),
    validator: (config) => {
      if (!config.bucketName) {
        throw new Error('Bucket name (GCS_BUCKET_NAME) is required in the provider configuration.');
      }
      if (!config.keyFileContent) {
        throw new Error('keyFileContent (GCS_KEY_FILE_CONTENT) is required in the provider configuration.');
      }
    },
  },
  destroy: ({ strapi }) => {
    strapi.log.info('Destroying Google Cloud Storage upload provider');
  },
  providers: {
    'strapi-provider-upload-google-cloud-storage': {
      init: provider.init,
    },
  },
};
