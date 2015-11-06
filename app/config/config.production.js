/*
 * Settings for the 'production' environment.
 */
var config = require('./config.global');

// Set a meaningful name for this environment.
config.env = 'production';

// In production we *do* want to use Google Analytics.
config.useGoogleAnalytics = true;

// Publish the configuration.
module.exports = config;