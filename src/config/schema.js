module.exports = {
  type: 'object',
  properties: {
    bucketName: {
      type: 'string',
    },
    publicFiles: {
      type: 'boolean',
    },
    uniform: {
      type: 'boolean',
    },
    basePath: {
      type: 'string',
    },
    basePathPublic: {
      type: 'string',
    },
    keyFileContent: {
      type: 'string',
    },
    domain: {
      type: 'string',
    },
    endpoint: {
      type: 'string',
    },
    storageClass: {
      type: 'string',
    },
  },
};
