'use strict';

/*
 * Settings for the 'test' environment.
 */
var config = require('./config.global');

// Set a meaningful name for this environment.
config.env = 'test';

/* SMTP Test Configuration */
config.smtp.host = '127.0.0.1';
config.smtp.port = 1025;
config.smtp.ignoreTLS = true;
config.smtp.fromEmailAddress = 'noreply-test@environment-agency.gov.uk';

/* cache configuration */
config.redis = {
  clientOptions: {
    host: 'localhost',
    port: 6379
  }
};

// API Endpoints
var BASEURL = {
  PROTOCOL: 'http://',
  SERVER: '192.168.56.101:',
  PORT: 8081
};

config.API = {};
config.API.endpoints = {
  'FILEUPLOAD': BASEURL.PROTOCOL + BASEURL.SERVER + BASEURL.PORT + '/data-exchange/upload',
  // 'FILEUPLOADVALIDATE': BASEURL.PROTOCOL + BASEURL.SERVER + BASEURL.PORT + '/data-exchange/validate',
  'FILEUPLOADCOMPLETE': BASEURL.PROTOCOL + BASEURL.SERVER + BASEURL.PORT + '/data-exchange/complete',
  'ERRORCHECKING': 'error_checking',
  'ERRORSENDING': 'error_sending'
};

config.API.STATUS_CODES = {
  OK: 200
};

// Publish the configuration.
module.exports = config;