'use strict';

/*
 * Settings for the 'production' environment.
 */
var config = require('./config.global');

// Set a meaningful name for this environment.
config.env = 'production';

// In production we *do* want to use Google Analytics.
config.useGoogleAnalytics = true;

/* SMTP Prod Configuration */
config.smtp.host = '127.0.0.1';
config.smtp.port = 1025;
config.smtp.ignoreTLS = true;
config.smtp.fromEmailAddress = 'noreply@environment-agency.gov.uk';

/* cache configuration */
config.redis = {
  clientOptions: {
    host: 'localhost',
    port: 6370,
    auth_pas: ''
  }
};

// API Endpoints

var BASEURL = {
  PROTOCOL: 'http://',
  SERVER: 'localhost:',
  PORT: 9020
};

config.API = {};
config.API.endpoints = {
  'FILEUPLOAD': BASEURL.PROTOCOL + BASEURL.SERVER + BASEURL.PORT + '/data-exchange/upload',
  'FILEUPLOADVALIDATE': BASEURL.PROTOCOL + BASEURL.SERVER + BASEURL.PORT + '/data-exchange/validate',
  'FILEUPLOADSEND': BASEURL.PROTOCOL + BASEURL.SERVER + BASEURL.PORT + '/data-exchange/complete',
  'ERRORCHECKING': 'error_checking',
  'ERRORSENDING': 'error_sending'
};

config.API.STATUS_CODES = {
  OK: 200
};

// Publish the configuration.
module.exports = config;