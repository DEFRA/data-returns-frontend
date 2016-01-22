'use strict';
/*
 * Settings for the 'development' environment.
 */
console.log('configuration_dev.js loaded')
var config = require('./configuration_global');
// Set a meaningful name for this environment.
config.env = 'dev';
config.sessionStorage.mode = 'redis';
/* DEV SMTP Configuration */
config.smtp.host = 'smtp.sendgrid.net';
config.smtp.port = 25;
config.smtp.ignoreTLS = true;
config.smtp.username = 'data-returns';
config.smtp.password = 'littleredscrewdriver';
config.smtp.fromEmailAddress = 'noreply-dev@environment-agency.gov.uk';

/* cache configuration */
config.redis = {
  clientOptions: {
    host: '10.208.4.75',
    port: 6379
  }
};

// API Endpoints

var BASEURL = {
  PROTOCOL: 'http://',
  SERVER: 'internal-DVDRASLB01-308583578.eu-west-1.elb.amazonaws.com:',
  PORT: 9020
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