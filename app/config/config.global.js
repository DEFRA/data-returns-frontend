/*
 * Default configuration for Data Returns front-end.
 * Settings below should be overridden where necessary for each environment.
 */
var config = {};

// By default we'll start with a non-specific environment name.
// This should always be overridden with something more meaningful.
config.env = 'default';

// The port this service will run on.
config.port = process.env.PORT || 3000;

// Should we require user authentication to view the pages?
// We would normally only require this when the service is hosted on a publicly-accessible
// location but is only intended to be accessed by the development team.
config.requireBasicAuth = false;
config.basicAuthUsername = process.env.DRF_BA_USERNAME;
config.basicAuthPassword = process.env.DRF_BA_PASSWORD;

// Parameters controlling session storage method.
// 'mode' can be 'default' or 'redis'.
// A good secret key should be used in public-facing environments.
config.sessionStorage = {
    mode: 'default',
    secret: process.env.DRF_SS_SECRET_KEY || '1234567890QWERTY'
};

// If using Redis for session storage, then we need the Redis connection parameters.
config.sessionStorage.redis = {
    host: process.env.DRF_SS_REDIS_HOST || 'localhost',
    port: process.env.DRF_SS_REDIS_PORT || 6379,
    db: 2
};

// Google Analytics configuration.
config.useGoogleAnalytics = false;
config.googleTagManagerId = process.env.DRF_TAG_MANAGER_ID;

// Publish the configuration.
module.exports = config;