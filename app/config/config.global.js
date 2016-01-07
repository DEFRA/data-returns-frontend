'use strict';
/*
 * Default configuration for Data Returns front-end.
 * Settings below should be overridden where necessary for each environment.
 *
 * Some settings are likely to be set via environment variables.  In these cases,
 * the configuration files should always prefer the environment variable value
 * over a hard-coded default.
 *
 * Environment variable naming conventions:
 *    DRF_***            "Data Returns Frontend ***"
 *    DRF_BA_***         "Data Returns Frontend Basic Authentication ***"
 *    DRF_SS_***         "Data Returns Frontend Session Storage ***"
 *    DRF_SS_REDIS_***   "Data Returns Frontend Session Storage (using Redis) ***"
 */
var config = {};
// By default we'll start with a non-specific environment name.
// This should always be overridden with something more meaningful.
config.env = 'default';
// The port this service will run on.
config.http = {};
config.http.port = process.env.PORT || 3000;
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

// Google Analytics configuration.
config.useGoogleAnalytics = false;
config.googleTagManagerId = process.env.DRF_TAG_MANAGER_ID || 'GTM-TEST';
//SMTP Configuration
config.smtp = {};
config.smtp.subject = 'Data returns online (England) confirmation code - ';
config.smtp.success = '250 Message accepted';
//Pin configuration
config.pin = {
  maxDigits: 4,
  defaultPin: 1024,
  MaxUploadsPerPin: 10,
  ValidTimePeriodMinutes: 60 * 24,
  TTL: 1000,
  useTTL: false,
  alwaysGenerate: true
};
// CSV Validation
config.CSV = {
  validate: true,
  VIRUS_SCAN: false
};



// Publish the configuration
module.exports = config;
