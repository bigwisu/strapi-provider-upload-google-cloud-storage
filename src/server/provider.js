'use strict';

const path = require('path');
const slugify = require('slugify');
const { Storage } = require('@google-cloud/storage');
const { pipeline } = require('stream/promises');

/**
 * lodash _.get native port
 *
 * checkout: https://github.com/you-dont-need/You-Dont-Need-Lodash-Underscore#_get
 *
 * Another solution is use destructor variable with default value as {} on each layer
 * but it appears so tricky.
 *
 * const { a: { b: { c: d = 42 } = {} } = {} } = object
 */
const get = (obj, path, defaultValue = undefined) => {
  const travel = (regexp) =>
    String.prototype.split
      .call(path, regexp)
      .filter(Boolean)
      .reduce((res, key) => (res !== null && res !== undefined ? res[key] : res), obj);
  const result = travel(/[,[\]]+?/) || travel(/[,[\].]+?/);
  return result === undefined || result === obj ? defaultValue : result;
};

/**
 * Check validity of Service Account configuration
 * @param config
 * @returns {{private_key}|{client_email}|{project_id}|any}
 */
const checkServiceAccount = (config) => {
  if (!config || !config.bucketName) {
    throw new Error('"Bucket name" is required in the provider configuration.');
  }

  if (config.keyFileContent) {
    try {
      const serviceAccount =
        typeof config.keyFileContent === 'string'
          ? JSON.parse(config.keyFileContent)
          : config.keyFileContent;

      if (!serviceAccount.project_id) {
        throw new Error(
          'Error parsing data "keyFileContent". Missing "project_id" field in JSON file.'
        );
      }

      if (!serviceAccount.client_email) {
        throw new Error(
          'Error parsing data "keyFileContent". Missing "client_email" field in JSON file.'
        );
      }

      if (!serviceAccount.private_key) {
        throw new Error(
          'Error parsing data "keyFileContent". Missing "private_key" field in JSON file.'
        );
      }
      config.serviceAccount = serviceAccount;
    } catch (error) {
        if (error instanceof SyntaxError) {
            throw new Error(
              'Error parsing data "keyFileContent", please be sure to copy/paste the full JSON file.'
            );
        }
        if (
          typeof config.keyFileContent === 'string' &&
          !config.keyFileContent.includes('private_key')
        ) {
          throw new Error(
            'Error parsing data "keyFileContent". Missing "private_key" field in JSON file.'
          );
        }
        throw error;
    }
  }
  if (!config.baseUrl) {
    config.baseUrl = `https://storage.googleapis.com/${config.bucketName}`;
  }
  if (config.domain) {
    config.baseUrl = `https://${config.domain}`;
  }
  return config.serviceAccount;
};

/**
 * Check bucket exist, or create it
 * @param GCS
 * @param bucketName
 * @returns {Promise<void>}
 */
const checkBucket = async (GCS, bucketName) => {
  let bucket = GCS.bucket(bucketName);
  const [exists] = await bucket.exists();
  if (!exists) {
    throw new Error(
      `An error occurs when we try to retrieve the Bucket "${bucketName}". Check if bucket exist on Google Cloud Platform.`
    );
  }
};

const setConfigField = (fieldValue, defaultValue) => {
  if (fieldValue === undefined) {
    return defaultValue;
  }

  if (typeof fieldValue === 'boolean') {
    return fieldValue;
  }

  if (typeof fieldValue === 'string') {
    if (fieldValue.toLowerCase() === 'true') {
      return true;
    }
    if (fieldValue.toLowerCase() === 'false') {
      return false;
    }
  }

  throw new Error(`Invalid boolean value for ${fieldValue}!`);
};

/**
 * Merge uploadProvider config with gcs key in custom Strapi config
 * @param providerConfig
 * @returns {{private_key}|{client_email}|{project_id}|any}
 */
const mergeConfigs = (providerConfig) => {
  const customGcsConfig = get(strapi, 'config.gcs', {});
  const customEnvGcsConfig = get(strapi, 'config.currentEnvironment.gcs', {});
  return { ...providerConfig, ...customGcsConfig, ...customEnvGcsConfig };
};

/**
 * Generate upload filename including path
 *
 * @param basePath
 * @param file
 * @returns string
 */
const generateUploadFileName = (file, basePath) => {
  const backupPath = 
    file.related && file.related.length > 0 && file.related[0].ref 
      ? `${file.related[0].ref}`
      : `${file.hash}`;
  const filePath = file.path ? `${file.path}/` : `${backupPath}/`;
  const extension = file.ext ? `${file.ext.toLowerCase()}` : ''; 
  const fileName = file.hash ? `${slugify(path.basename(file.hash))}` : 'no-hash'; 
  return `${basePath}${filePath}${fileName}${extension}`; 
};

/**
 * Prepare file before upload
 * @param file
 * @param config
 * @param basePath
 * @param GCS
 * @returns {Promise<{fileAttributes: {metadata: (*|{contentDisposition: string, cacheControl: string}), gzip: (string|boolean|((buf: InputType, callback: CompressCallback) => void)|((buf: InputType, options: ZlibOptions, callback: CompressCallback) => void)|gzip|*), contentType: (string|string|*)}, fullFileName: (string|Promise<string>|*|string)}>}
 */
const prepareUploadFile = async (file, config, basePath, GCS) => {
  let deleteFile = false;
  const fullFileName =
    typeof config.generateUploadFileName === 'function'
      ? await config.generateUploadFileName(file)
      : generateUploadFileName(basePath, file);
  if (!config.skipCheckBucket) {
    await checkBucket(GCS, config.bucketName);
  }
  const bucket = GCS.bucket(config.bucketName);
  const bucketFile = bucket.file(fullFileName);
  const [fileExists] = await bucketFile.exists();
  if (fileExists) {
    deleteFile = true;
  }
  const asciiFileName = file.name.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
  const fileAttributes = {
    contentType:
      typeof config.getContentType === 'function' ? config.getContentType(file) : file.mime,
    gzip: typeof config.gzip === 'boolean' ? config.gzip : 'auto',
    metadata:
      typeof config.metadata === 'function'
        ? config.metadata(file)
        : {
            contentDisposition: `inline; filename="${asciiFileName}"`,
            cacheControl: `public, max-age=${config.cacheMaxAge || 3600}`,
          },
  };
  if (!config.uniform) {
    fileAttributes.public = config.publicFiles;
  }

  return { fileAttributes, bucketFile, fullFileName, deleteFile };
};

const init = (strapi) => (config) => { // Updated to receive config
  const serviceAccount = checkServiceAccount(config); // Updated to pass config
  let GCS;
  if (config.keyFileContent) {
    // Provide service account credentials
    GCS = new Storage({
      projectId: serviceAccount.project_id, // Pass projectId separately
      credentials: {
        client_email: serviceAccount.client_email,
        private_key: serviceAccount.private_key,
      }, // Pass credentials separately
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
  checkServiceAccount,
  checkBucket,
  setConfigField,
  mergeConfigs,
  generateUploadFileName,
  prepareUploadFile,
  init,
};
