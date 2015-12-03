'use strict';

/*
 * Settings for the 'test' environment.
 */
var config = require('./config.global');

// Set a meaningful name for this environment.
config.env = 'test';

// Publish the configuration.
module.exports = config;