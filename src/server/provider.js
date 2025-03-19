'use strict';

const path = require('path');
const slugify = require('slugify');
const { Storage } = require('@google-cloud/storage');
const { pipeline } = require('stream/promises');

// ... (other helper functions like setConfigField, checkServiceAccount, checkBucket, generateUploadFileName, prepareUploadFile)

const init = (strapi) => {
  const config = strapi.config.get('plugin.upload.providerOptions');
  const serviceAccount = checkServiceAccount(config);
  let GCS;
  if (config.keyFileContent) {
    // Provide service account credentials
    GCS = new Storage({
      projectId: serviceAccount.project_id,
      credentials: JSON.parse(config.keyFileContent),
    });
  } else {
    // Storage will attempt to find Application Default Credentials
    GCS = new Storage();
  }

  const basePath = `${config.basePath}/`.replace(/^\/+/, '');
  const baseUrl = config.domain ? `https://${config.domain}` : `https://storage.googleapis.com/${config.bucketName}`;

  return {
    async upload(file) {
      try {
        const { fileAttributes, bucketFile, fullFileName, deleteFile } = await prepareUploadFile(
          file,
          config,
          basePath,
          GCS
        );
        if (deleteFile) {
          console.info('File already exists. Try to remove it.');
          await this.delete(file);
        }

        await bucketFile.save(file.buffer, fileAttributes);
        file.url = `${baseUrl}/${fullFileName}`;
        console.debug(`File successfully uploaded to ${file.url}`);
      } catch (error) {
        // Re-throw so that the upload operation will fail
        // and error will surface to the user in the Strapi admin front-end
        console.error(`Error uploading file to Google Cloud Storage: ${error.message}`);
        throw error;
      }
    },
    async uploadStream(file) {
      try {
        const { fileAttributes, bucketFile, fullFileName, deleteFile } = await prepareUploadFile(
          file,
          config,
          basePath,
          GCS
        );
        if (deleteFile) {
          console.info('File already exists. Try to remove it.');
          await this.delete(file);
        }
        await pipeline(file.stream, bucketFile.createWriteStream(fileAttributes));
        console.debug(`File successfully uploaded to ${file.url}`);
        file.url = `${baseUrl}/${fullFileName}`;
      } catch (error) {
        // Re-throw so that the upload operation will fail
        // and error will surface to the user in the Strapi admin front-end
        console.error(`Error uploading file to Google Cloud Storage: ${error.message}`);
        throw error;
      }
    },
    async delete(file) {
      if (!file.url) {
        console.warn('Remote file was not found, you may have to delete manually.');
        return;
      }

      const fileName = file.url.replace(`${baseUrl}/`, '');
      const bucket = GCS.bucket(config.bucketName);
      try {
        await bucket.file(fileName).delete();
        strapi.log.debug(`File ${fileName} successfully deleted`);
      } catch (error) {
        if (error.code === 404) {
          strapi.log.error('Remote file was not found, you may have to delete manually.');
        } else {
          strapi.log.error(`Error deleting file ${fileName}: ${error.message}`);
          throw error;
        }
      }
    },
    isPrivate() {
      return !config.publicFiles;
    },
    async getSignedUrl(file) {
      const options = {
        version: 'v4',
        action: 'read',
        expires: config.expires || Date.now() + 15 * 60 * 1000, // 15 minutes from now
      };
      const fileName = file.url.replace(`${baseUrl}/`, '');
      const [url] = await GCS.bucket(config.bucketName).file(fileName).getSignedUrl(options);
      return { url };
    },
  };
};

module.exports = {
  // ... (helper functions)
  init,
};
