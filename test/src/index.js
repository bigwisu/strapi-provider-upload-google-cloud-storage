const { strict: assert } = require('assert');
const mockRequire = require('mock-require');
const sinon = require('sinon');

describe('/src/index.js', () => {
  let strapi;
  let sandbox;

  beforeEach(() => {
    // Create a mock Strapi instance
    strapi = {
      log: {
        info: sinon.stub(),
        debug: sinon.stub(),
        error: sinon.stub(),
        warn: sinon.stub(),
      },
    };

    // Create a sandbox for mocking
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    // Restore all mocks after each test
    sandbox.restore();
    mockRequire.stopAll();
  });

  it('should register the provider', () => {
    // Arrange
    const provider = mockRequire.reRequire('../../src/index');

    // Act
    provider.register({ strapi });

    // Assert
    assert.equal(strapi.log.info.callCount, 1);
    assert.equal(strapi.log.info.firstCall.args[0], 'Registering Google Cloud Storage upload provider');
  });

  it('should bootstrap the provider', () => {
    // Arrange
    const provider = mockRequire.reRequire('../../src/index');

    // Act
    provider.bootstrap({ strapi });

    // Assert
    assert.equal(strapi.log.info.callCount, 1);
    assert.equal(strapi.log.info.firstCall.args[0], 'Bootstrapping Google Cloud Storage upload provider');
  });

  it('should destroy the provider', () => {
    // Arrange
    const provider = mockRequire.reRequire('../../src/index');

    // Act
    provider.destroy({ strapi });

    // Assert
    assert.equal(strapi.log.info.callCount, 1);
    assert.equal(strapi.log.info.firstCall.args[0], 'Destroying Google Cloud Storage upload provider');
  });

  it('should have a default config', () => {
    // Arrange
    const provider = mockRequire.reRequire('../../src/index');

    // Assert
    assert.ok(provider.config.default);
  });

  it('should have a config validator', () => {
    // Arrange
    const provider = mockRequire.reRequire('../../src/index');

    // Assert
    assert.ok(provider.config.validator);
    assert.equal(typeof provider.config.validator, 'function');
  });

  it('should throw an error if bucketName is missing', () => {
    // Arrange
    const provider = mockRequire.reRequire('../../src/index');
    const config = {};

    // Act & Assert
    assert.throws(() => provider.config.validator(config), /Bucket name \(GCS_BUCKET_NAME\) is required in the provider configuration./);
  });

  it('should throw an error if keyFileContent is missing', () => {
    // Arrange
    const provider = mockRequire.reRequire('../../src/index');
    const config = { bucketName: 'test-bucket' };

    // Act & Assert
    assert.throws(() => provider.config.validator(config), /keyFileContent \(GCS_KEY_FILE_CONTENT\) is required in the provider configuration./);
  });

  it('should have a provider', () => {
    // Arrange
    const provider = mockRequire.reRequire('../../src/index');

    // Assert
    assert.ok(provider.providers);
    assert.ok(provider.providers['strapi-provider-upload-google-cloud-storage']);
    assert.ok(provider.providers['strapi-provider-upload-google-cloud-storage'].init);
    assert.equal(typeof provider.providers['strapi-provider-upload-google-cloud-storage'].init, 'function');
  });
});
