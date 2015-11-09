/*
 * Settings for the 'development' environment.
 */
var config = require('./config.global');

// Set a meaningful name for this environment.
config.env = 'development';

// TODO: Review this if Session Storage changes.
// Use Redis for Session Storage in development, so that sessions are persisted
// across Node re-starts.
config.sessionStorage.mode = 'redis';

// Publish the configuration.
module.exports = config;