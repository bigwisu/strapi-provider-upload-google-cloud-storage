const { strict: assert } = require('assert');
const mockRequire = require('mock-require');

const {
  checkServiceAccount,
  checkBucket,
  setConfigField,
  mergeConfigs,
  generateUploadFileName,
  init,
} = require('../../src/server/provider');
const sinon = require('sinon');

describe('/src/server/provider.js', () => {
  afterEach(() => {
    mockRequire.stopAll();
    sinon.restore();
  });

  describe('#checkServiceAccount', () => {
    describe('when config is invalid', () => {
      it('must throw error "Bucket name" is required!', () => {
        const error = new Error('"Bucket name" is required in the provider configuration.');
        assert.throws(() => checkServiceAccount(), error);
      });

      it('must throw error when keyFileContent is not a valid JSON', () => {
        const config = {
          keyFileContent: "I'm not a valid JSON",
          bucketName: 'some-bucket',
        };
        const error = new Error(
          'Error parsing data "keyFileContent", please be sure to copy/paste the full JSON file.'
        );
        assert.throws(() => checkServiceAccount(config), error);
      });

      it('must throw error when keyFileContent is missing "project_id"', () => {
        const config = {
          keyFileContent: {},
          bucketName: 'some-bucket',
        };
        const error = new Error(
          'Error parsing data "keyFileContent". Missing "project_id" field in JSON file.'
        );
        assert.throws(() => checkServiceAccount(config), error);
      });

      it('must throw error when keyFileContent is missing "client_email"', () => {
        const config = {
          keyFileContent: {
            project_id: '123',
          },
          bucketName: 'some-bucket',
        };
        const error = new Error(
          'Error parsing data "keyFileContent". Missing "client_email" field in JSON file.'
        );
        assert.throws(() => checkServiceAccount(config), error);
      });

      it('must throw error when keyFileContent is missing "private_key"', () => {
        const config = {
          keyFileContent: {
            project_id: '123',
            client_email: 'my@email.org',
          },
          bucketName: 'some-bucket',
        };
        const error = new Error(
          'Error parsing data "keyFileContent". Missing "private_key" field in JSON file.'
        );
        assert.throws(() => checkServiceAccount(config), error);
      });

      it('must throw error when keyFileContent is a string but missing "private_key"', () => {
        const config = {
          keyFileContent: `{"project_id": "123", "client_email": "my@email.org"}`,
          bucketName: 'some-bucket',
        };
        const error = new Error(
          'Error parsing data "keyFileContent". Missing "private_key" field in JSON file.'
        );
        assert.throws(() => checkServiceAccount(config), error);
      });
    });

    describe('when config is valid', () => {
      it('must accept minimal configuration without errors', () => {
        const config = {
          bucketName: 'some-bucket',
        };
        checkServiceAccount(config);
      });

      it('must accept configurations without errors', () => {
        const config = {
          keyFileContent: {
            project_id: '123',
            client_email: 'my@email.org',
            private_key: 'a random key',
          },
          bucketName: 'some-bucket',
        };
        checkServiceAccount(config);
      });

      it('must accept configurations with json string', () => {
        const config = {
          keyFileContent: `{
            "project_id": "123",
            "client_email": "my@email.org",
            "private_key": "a random key"
          }`,
          bucketName: 'some-bucket',
        };
        checkServiceAccount(config);
      });

      it('must redefine baseUrl to default value', () => {
        const config = {
          keyFileContent: {
            project_id: '123',
            client_email: 'my@email.org',
            private_key: 'a random key',
          },
          bucketName: 'some-bucket',
        };
        checkServiceAccount(config);
        assert.ok(Object.keys(config).includes('baseUrl'));
        assert.equal(config.baseUrl, 'https://storage.googleapis.com/some-bucket');
      });

      it('must accept baseUrl changing value', () => {
        const config = {
          keyFileContent: {
            project_id: '123',
            client_email: 'my@email.org',
            private_key: 'a random key',
          },
          bucketName: 'some-bucket',
          baseUrl: 'http://localhost',
        };
        checkServiceAccount(config);
        assert.equal(config.baseUrl, 'http://localhost');
      });
      it('must accept domain changing value', () => {
        const config = {
          keyFileContent: {
            project_id: '123',
            client_email: 'my@email.org',
            private_key: 'a random key',
          },
          bucketName: 'some-bucket',
          domain: 'my-domain.com',
        };
        checkServiceAccount(config);
        assert.equal(config.baseUrl, 'https://my-domain.com');
      });
    });
  });

  describe('#checkBucket', () => {
    describe('when valid bucket', () => {
      it('must check if bucket exists', async () => {
        let assertCount = 0;

        const gcsMock = {
          bucket(bucketName) {
            assertCount += 1;
            assert.equal(bucketName, 'my-bucket');
            return {
              async exists() {
                assertCount += 1;
                return [true];
              },
            };
          },
        };
        await assert.doesNotReject(checkBucket(gcsMock, 'my-bucket'));
        assert.equal(assertCount, 2);
      });
    });

    describe('when bucket does not exists', async () => {
      it('must throw error message', async () => {
        let assertCount = 0;

        const gcsMock = {
          bucket(bucketName) {
            assertCount += 1;
            assert.equal(bucketName, 'my-bucket');
            return {
              async exists() {
                assertCount += 1;
                return [false];
              },
            };
          },
        };

        const error = new Error(
          'An error occurs when we try to retrieve the Bucket "my-bucket". Check if bucket exist on Google Cloud Platform.'
        );

        await assert.rejects(checkBucket(gcsMock, 'my-bucket'), error);

        assert.equal(assertCount, 2);
      });
    });
  });

  describe('#setConfigField', () => {
    describe('when config field is undefined', () => {
      it('must return default value true', async () => {
        await assert.equal(setConfigField(undefined, true), true);
      });
      it('must return default value false', async () => {
        await assert.equal(setConfigField(undefined, false), false);
      });
      it('must return error if not a string with true or false value', async () => {
        let fieldValue = 'undefined';
        const error = new Error(`Invalid boolean value for ${fieldValue}!`);
        assert.throws(() => setConfigField(fieldValue, true), error);
      });
      it('must return true boolean value if boolean value is true and default value is false', async () => {
        await assert.equal(setConfigField(true, false), true);
      });
      it('must return true boolean value if boolean value is true and default value is true', async () => {
        await assert.equal(setConfigField(false, true), false);
      });
    });
  });

  describe('#mergeConfigs', () => {
    let strapiOriginal;
    let sandbox;

    beforeEach(() => {
      strapiOriginal = global.strapi;
      sandbox = sinon.createSandbox();

      global.strapi = {
        config: {
          gcs: {}, // Initialize gcs object
        },
      };
    });

    afterEach(() => {
      sandbox.restore();
      if (strapiOriginal === undefined) {
        delete global.strapi;
      } else {
        global.strapi = strapiOriginal;
      }
    });

    it('must apply configurations', () => {
      const result = mergeConfigs({ foo: 'bar' });
      const expected = { foo: 'bar' };
      assert.deepEqual(result, expected);
    });

    it('must merge with strapi.config.gcs global vars', () => { // Updated test description
      global.strapi.config.gcs = { // Updated to use strapi.config.gcs
        number: 910,
        foo: 'thanos',
      };
      const result = mergeConfigs({ foo: 'bar', key: 'value' });
      const expected = { key: 'value', foo: 'thanos', number: 910 };
      assert.deepEqual(result, expected);
    });
  });

  describe('#generateUploadFileName', () => {
    it('must save filename in right name', async () => {
      const testData = [
        [
          '',
          'christopher-campbell_df9a53d774/christopher-campbell_df9a53d774.jpeg',
          {
            name: 'christopher-campbell',
            alternativeText: undefined,
            caption: undefined,
            hash: 'christopher-campbell_df9a53d774',
            ext: '.jpeg',
            mime: 'image/jpeg',
            size: 823.58,
            width: 5184,
            height: 3456,
            buffer: 'file buffer information',
          },
        ],
        [
          '',
          'thumbnail_christopher-campbell_df9a53d774/thumbnail_christopher-campbell_df9a53d774.jpeg',
          {
            hash: 'thumbnail_christopher-campbell_df9a53d774',
            ext: '.jpeg',
            mime: 'image/jpeg',
            width: 234,
            height: 156,
            size: 5.53,
            buffer: 'file buffer information',
            path: null,
          },
        ],
        [
          'base-path/',
          'base-path/galleries/boris-smokrovic_9fd5439b3e/boris-smokrovic_9fd5439b3e.jpeg',
          {
            name: 'boris-smokrovic',
            alternativeText: undefined,
            caption: undefined,
            hash: 'boris-smokrovic_9fd5439b3e',
            ext: '.jpeg',
            mime: 'image/jpeg',
            size: 897.78,
            related: [{ refId: '1', ref: 'galleries', source: undefined, field: 'cover' }],
            width: 4373,
            height: 2915,
            buffer: 'file buffer data',
          },
        ],
        [
          'root/child/',
          'root/child/no-hash', // Update expected value
          {
            hash: undefined, // Add hash to undefined
            ext: undefined, // Add ext to undefined
            mime: 'image/jpeg',
            width: 234,
            height: 156,
            size: 8.18,
            buffer: 'file buffer data',
            path: null,
          },
        ],
      ];

      const runTest = async ([basePath, expectedFileName, fileData]) => {
        const generatedFileName = await generateUploadFileName(fileData, basePath); // Updated function call
        assert.equal(expectedFileName, generatedFileName);
      };

      const promises = testData.map((data) => runTest(data));
      await Promise.all(promises);
    });
  });

  
  describe('#init', () => {
    let strapiOriginal;
    let sandbox;

    beforeEach(() => {
      strapiOriginal = global.strapi;
      sandbox = sinon.createSandbox();

      global.strapi = {
        config: {
          get: sandbox.stub().returns({}),
        },
        log: {
          info: sandbox.stub(),
          debug: sandbox.stub(),
          error: sandbox.stub(),
        },
      };
    });

    afterEach(() => {
      sandbox.restore();
      if (strapiOriginal === undefined) {
        delete global.strapi;
      } else {
        global.strapi = strapiOriginal;
      }
    });

    it('must return an object with upload, delete, isPrivate and getSignedUrl methods', () => {
      const config = {
        keyFileContent: {
          project_id: '123',
          client_email: 'my@email.org',
          private_key: 'a random key',
        },
        bucketName: 'any',
      };

      const result = init(global.strapi)(config); // Updated call

      assert.ok(Object.keys(result).includes('upload'));
      assert.equal(typeof result.upload, 'function');
      assert.ok(Object.keys(result).includes('uploadStream'));
      assert.equal(typeof result.uploadStream, 'function');
      assert.ok(Object.keys(result).includes('delete'));
      assert.equal(typeof result.delete, 'function');
      assert.ok(Object.keys(result).includes('isPrivate'));
      assert.equal(typeof result.isPrivate, 'function');
      assert.ok(Object.keys(result).includes('getSignedUrl'));
      assert.equal(typeof result.getSignedUrl, 'function');
    });

    it('must instance google cloud storage with right configurations', () => {
      let assertionsCount = 0;
      mockRequire('@google-cloud/storage', {
        Storage: class {
          constructor(...args) {
            assertionsCount += 1;
            assert.deepEqual(args, [
              {
                credentials: {
                  client_email: 'my@email.org',
                  private_key: 'a random key',
                },
                projectId: '123',
              },
            ]);
          }
        },
      });
      const provider = mockRequire.reRequire('../../src/server/provider');
      const config = {
        keyFileContent: {
          project_id: '123',
          client_email: 'my@email.org',
          private_key: 'a random key',
        },
        bucketName: 'any',
      };
      provider.init(global.strapi)(config); // Updated call
      assert.equal(assertionsCount, 1);
    });
  });
});
