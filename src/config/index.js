module.exports = {
  bucketName: process.env.GCS_BUCKET_NAME,
  publicFiles: process.env.GCS_PUBLIC_FILES || false,
  uniform: process.env.GCS_UNIFORM || true,
  basePath: process.env.GCS_BASE_PATH || '',
  basePathPublic: process.env.GCS_BASE_PATH_PUBLIC || '',
  keyFileContent: process.env.GCS_KEY_FILE_CONTENT,
  domain: process.env.GCS_DOMAIN,
  endpoint: process.env.GCS_ENDPOINT,
  storageClass: process.env.GCS_STORAGE_CLASS,
};
