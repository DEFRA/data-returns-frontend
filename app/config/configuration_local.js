'use strict';
/*
 * Settings for the 'development' environment.
 */
var config = require('./configuration_global');
// Set a meaningful name for this environment.
config.env = 'local';
config.sessionStorage.mode = 'redis';
/* DEV SMTP Configuration */
config.smtp.host = 'email-smtp.eu-west-1.amazonaws.com';
config.smtp.port = 587;
config.smtp.ignoreTLS = false;
config.smtp.username = 'AKIAIXX25ZNDL33YHUIA';
config.smtp.password = 'AmK/wWewBglYrvpyRmnLCPm7KlEcXJqPHMJIao585bzP';
config.smtp.fromEmailAddress = 'noreply-dev@environment-agency.gov.uk';

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
  PORT: 8081//9020
};

config.API = {};
config.API.endpoints = {
  'FILEUPLOAD': BASEURL.PROTOCOL + BASEURL.SERVER + BASEURL.PORT + '/data-exchange/upload',
  'FILEUPLOADCOMPLETE': BASEURL.PROTOCOL + BASEURL.SERVER + BASEURL.PORT + '/data-exchange/complete',
  'ERRORCHECKING': 'error_checking',
  'ERRORSENDING': 'error_sending'
};

config.API.STATUS_CODES = {
  OK: 200
};



// Publish the configuration.
module.exports = config;