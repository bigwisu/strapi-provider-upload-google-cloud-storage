# Strapi v5 Google Cloud Storage Upload Provider

[![npm version](https://img.shields.io/npm/v/@strapi-community/strapi-provider-upload-google-cloud-storage.svg)](https://www.npmjs.org/package/@strapi-community/strapi-provider-upload-google-cloud-storage)
[![npm downloads](https://img.shields.io/npm/dm/@strapi-community/strapi-provider-upload-google-cloud-storage.svg)](https://www.npmjs.org/package/@strapi-community/strapi-provider-upload-google-cloud-storage)
[![coverage](https://codecov.io/gh/strapi-community/strapi-provider-upload-google-cloud-storage/branch/master/graph/badge.svg?token=p4KW9ytA6u)](https://codecov.io/gh/strapi-community/strapi-provider-upload-google-cloud-storage)

**Non-Official** Google Cloud Storage Provider for Strapi v5 Upload

This provider allows you to use Google Cloud Storage as the storage backend for your Strapi v5 application's media library.

## Installation

1.  **Install the package:**

    Navigate to your Strapi project's root directory and run one of the following commands:

    ```bash
    npm install @strapi-community/strapi-provider-upload-google-cloud-storage
    ```

    or

    ```bash
    yarn add @strapi-community/strapi-provider-upload-google-cloud-storage
    ```

## <a name="create-bucket"></a> Create Your Google Cloud Storage Bucket

1.  **Create a bucket:** If you don't already have one, create a new bucket in your Google Cloud Storage project.
    *   [How to create a bucket](https://cloud.google.com/storage/docs/creating-buckets)
    *   [Bucket locations](https://cloud.google.com/storage/docs/locations)
2.  **Access Control:** The bucket should be created with **fine-grained** access control. This plugin will manage public read access for uploaded files as needed.

## <a name="setup-auth"></a> Set Up Google Authentication

There are two main ways to set up authentication:

### 1. Application Default Credentials (Recommended for Google Cloud Deployments)

If you're deploying your Strapi application to a Google Cloud Platform service that supports [Application Default Credentials](https://cloud.google.com/docs/authentication/production#finding_credentials_automatically) (e.g., App Engine, Cloud Run, Cloud Functions), you can skip the manual service account key setup. The provider will automatically use the available credentials.

### 2. Service Account Key (For Non-Google Cloud Deployments)

If you're deploying outside of Google Cloud, follow these steps:

1.  **Create a service account key:**
    *   Go to the **Create service account key** page in the Google Cloud Console: [https://console.cloud.google.com/apis/credentials/serviceaccountkey](https://console.cloud.google.com/apis/credentials/serviceaccountkey)
    *   Select **New service account**.
    *   Enter a **Service account name**.
    *   Assign the **Cloud Storage > Storage Admin** role.
    *   Select `JSON` as the **Key type**.
    *   Click **Create**. A JSON file containing your key will be downloaded.
2.  **Copy the JSON content:** Open the downloaded JSON file and copy its entire content.
3. **Configure Strapi:** You will paste this content into your Strapi configuration file.

## Configure the Provider in Strapi v5

1.  **Edit the configuration file:**
    *   Create or edit the file `config/plugins.js` in your Strapi project's root directory.
    *   If you have different configuration for each environment, you can create or edit files:
        *   `config/env/development/plugins.js`
        *   `config/env/production/plugins.js`
        *   ...etc.
2.  **Add the provider configuration:**

    Here are examples for different scenarios:

    **Example 1: Application Default Credentials (Minimal Setup)**

    This is the simplest setup for deployments on Google Cloud services.

    ```javascript
    // config/plugins.js
    module.exports = {
      upload: {
        config: {
          provider: '@strapi-community/strapi-provider-upload-google-cloud-storage',
          providerOptions: {
            bucketName: 'YOUR_BUCKET_NAME', // Replace with your bucket name
            publicFiles: false, // Set to true for public access, false for signed URLs
            uniform: false, // Set to true if your bucket has uniform access enabled
            basePath: '', // Optional: Set a base path for all uploads
          },
        },
      },
      // ... other plugins
    };
    ```

    **Example 2: Service Account Key (Outside Google Cloud)**

    This is for deployments outside of Google Cloud.

    ```javascript
    // config/plugins.js
    module.exports = {
      upload: {
        config: {
          provider: '@strapi-community/strapi-provider-upload-google-cloud-storage',
          providerOptions: {
            bucketName: 'YOUR_BUCKET_NAME', // Replace with your bucket name
            publicFiles: true, // Set to true for public access, false for signed URLs
            uniform: false, // Set to true if your bucket has uniform access enabled
            serviceAccount: {
              // Paste the full JSON content here
              "type": "service_account",
              "project_id": "your-project-id",
              "private_key_id": "your-private-key-id",
              "private_key": "-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY\n-----END PRIVATE KEY-----\n",
              "client_email": "your-service-account-email",
              "client_id": "your-client-id",
              "auth_uri": "https://accounts.google.com/o/oauth2/auth",
              "token_uri": "https://oauth2.googleapis.com/token",
              "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
              "client_x509_cert_url": "your-client-x509-cert-url"
            },
            baseUrl: 'https://storage.googleapis.com/YOUR_BUCKET_NAME', // Optional: Customize the base URL
            basePath: '', // Optional: Set a base path for all uploads
          },
        },
      },
      // ... other plugins
    };
    ```
    **Important:**
    * Replace `YOUR_BUCKET_NAME` with the actual name of your bucket.
    * Replace the content of `serviceAccount` with the content of your JSON file.
    * Be careful with indentation when pasting the JSON content.

    **Example 3: Environment Variables**

    This is a recommended approach for managing sensitive information.

    ```javascript
    // config/plugins.js
    module.exports = ({ env }) => ({
      upload: {
        config: {
          provider: '@strapi-community/strapi-provider-upload-google-cloud-storage',
          providerOptions: {
            serviceAccount: env.json('GCS_SERVICE_ACCOUNT'), // JSON content from environment variable
            bucketName: env('GCS_BUCKET_NAME'),
            basePath: env('GCS_BASE_PATH', ''), // Optional: Default to empty string
            baseUrl: env('GCS_BASE_URL', `https://storage.googleapis.com/${env('GCS_BUCKET_NAME')}`), // Optional: Default to Google Cloud URL
            publicFiles: env.bool('GCS_PUBLIC_FILES', true), // Optional: Default to true
            uniform: env.bool('GCS_UNIFORM', false), // Optional: Default to false
          },
        },
      },
      // ... other plugins
    });
    ```

    Then, set the environment variables (e.g., in a `.env` file):

    ```
    GCS_SERVICE_ACCOUNT={"type": "service_account", ...} # Paste the full JSON content here
    GCS_BUCKET_NAME=your-bucket-name
    GCS_BASE_PATH=uploads
    GCS_BASE_URL=https://your-custom-domain.com
    GCS_PUBLIC_FILES=true
    GCS_UNIFORM=false
    ```

## Configure `strapi::security` Middleware (CSP)

To avoid Content Security Policy (CSP) errors, you need to add your Google Cloud Storage URL to the `img-src` and `media-src` directives in the `strapi::security` middleware.

1.  **Edit `config/middlewares.js`:**

    ```javascript
    // config/middlewares.js
    module.exports = [
      'strapi::errors',
      {
        name: 'strapi::security',
        config: {
          contentSecurityPolicy: {
            useDefaults: true,
            directives: {
              'connect-src': ["'self'", 'https:'],
              'img-src': ["'self'", 'data:', 'blob:', 'storage.googleapis.com', 'YOUR_CUSTOM_DOMAIN'], // Add your custom domain if you use one
              'media-src': ["'self'", 'data:', 'blob:', 'storage.googleapis.com', 'YOUR_CUSTOM_DOMAIN'], // Add your custom domain if you use one
              upgradeInsecureRequests: null,
            },
          },
        },
      },
      'strapi::cors',
      'strapi::poweredBy',
      'strapi::logger',
      'strapi::query',
      'strapi::body',
      'strapi::favicon',
      'strapi::public',
    ];
    ```

    *   Replace `YOUR_CUSTOM_DOMAIN` with your custom domain if you are using one.

## Configuration Options

Here's a detailed explanation of the available configuration options:

*   **`serviceAccount`:**
    *   **Type:** `string` or `object` (JSON)
    *   **Description:** The JSON content of your Google Cloud service account key. If you're using Application Default Credentials, you can omit this.
    *   **Required:** Only if not using Application Default Credentials.
*   **`bucketName`:**
    *   **Type:** `string`
    *   **Description:** The name of your Google Cloud Storage bucket.
    *   **Required:** Yes.
*   **`baseUrl`:**
    *   **Type:** `string`
    *   **Description:** The base URL for accessing your files.
    *   **Default:** `https://storage.googleapis.com/{bucket-name}`
    *   **Optional:** You can customize this if you're using a custom domain.
*   **`basePath`:**
    *   **Type:** `string`
    *   **Description:** A base path (directory) within your bucket where all uploaded files will be stored.
    *   **Default:** `''` (empty string, meaning the root of the bucket)
    *   **Optional:** Yes.
*   **`publicFiles`:**
    *   **Type:** `boolean`
    *   **Description:** Determines whether files are publicly accessible or require signed URLs.
    *   **Default:** `true`
    *   **Optional:** Yes.
    *   **Note:** If set to `false`, files will be signed on the Content Manager (not the Content API), making them only visible to authenticated users.
*   **`uniform`:**
    *   **Type:** `boolean`
    *   **Description:** Set to `true` if your bucket has uniform bucket-level access enabled.
    *   **Default:** `false`
    *   **Optional:** Yes.
*   **`skipCheckBucket`:**
    *   **Type:** `boolean`
    *   **Description:** Set to `true` to skip checking if the bucket exists. Useful for private buckets.
    *   **Default:** `false`
    *   **Optional:** Yes.
*   **`cacheMaxAge`:**
    *   **Type:** `number`
    *   **Description:** The `cache-control` header value (in seconds) for uploaded files.
    *   **Default:** `3600` (1 hour)
    *   **Optional:** Yes.
*   **`gzip`:**
    *   **Type:** `string` (`true`, `false`, `auto`)
    *   **Description:** Whether to store files with gzip compression.
    *   **Default:** `auto`
    *   **Optional:** Yes.
*   **`expires`:**
    *   **Type:** `Date`, `number`, `string`
    *   **Description:** The expiration time for signed URLs (when `publicFiles` is `false`).
    *   **Default:** `900000` (15 minutes)
    *   **Max:** `604800000` (7 days)
    *   **Optional:** Yes.
*   **`metadata`:**
    *   **Type:** `function`
    *   **Description:** A function to compute custom metadata for uploaded files.
    *   **Default:** `undefined`
    *   **Optional:** Yes.
    *   **Example:**

        ```javascript
        metadata: (file) => ({
          cacheControl: `public, max-age=${60 * 60 * 24 * 7}`, // One week
          contentLanguage: 'en-US',
          contentDisposition: `attachment; filename="${file.name}"`,
        }),
        ```

*   **`generateUploadFileName`:**
    *   **Type:** `function`
    *   **Description:** A function to customize the uploaded file's name and path.
    *   **Default:** `undefined` (uses the default algorithm)
    *   **Optional:** Yes.
    *   **Example:**

        ```javascript
        generateUploadFileName: async (file) => {
          const hash = await ...; // Some hashing function, for example MD-5
          const extension = file.ext.toLowerCase().substring(1);
          return `${extension}/${slugify(path.parse(file.name).name)}-${hash}.${extension}`;
        },
        ```

## FAQ

### Common Errors

*   **Uniform Access Error:**

    ```
    Error uploading file to Google Cloud Storage: Cannot insert legacy ACL for an object when uniform bucket-level access is enabled
    ```

    **Solution:** Set `uniform` to `true` in your `providerOptions`.

*   **Service Account JSON Error:**

    ```
    Error: Error parsing data "Service Account JSON", please be sure to copy/paste the full JSON file
    ```

    **Solution:** Double-check that you've copied the *entire* content of the service account JSON file and pasted it correctly into your configuration. Ensure proper JSON formatting and indentation.

## Community Support

*   GitHub (Bug reports, contributions)
*   Discord (For live discussion with the Community and Strapi team)
*   Community Forum (Questions and Discussions)

## License

See the MIT License file for licensing information.
