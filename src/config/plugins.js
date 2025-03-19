module.exports = ({ env }) => ({
    upload: {
      config: {
        provider: 'strapi-provider-upload-google-cloud-storage',
        providerOptions: {
          bucketName: env('GCS_BUCKET_NAME'),
          publicFiles: env('GCS_PUBLIC_FILES', false),
          uniform: env('GCS_UNIFORM', true),
          basePath: env('GCS_BASE_PATH', ''),
          basePathPublic: env('GCS_BASE_PATH_PUBLIC', ''),
          keyFileContent: env('GCS_KEY_FILE_CONTENT'),
          domain: env('GCS_DOMAIN'),
          endpoint: env('GCS_ENDPOINT'),
          storageClass: env('GCS_STORAGE_CLASS'),
        },
      },
    },
  });
  