'use strict';

/*
 * Settings for the 'test' environment.
 */
var config = require('./configuration_global');

// Set a meaningful name for this environment.
config.env = 'test';

/* SMTP Test Configuration */
config.smtp.host = 'email-smtp.eu-west-1.amazonaws.com';
config.smtp.port = 587;
config.smtp.ignoreTLS = false;
config.smtp.username = '';
config.smtp.password = '';
config.smtp.fromEmailAddress = 'noreply-test@environment-agency.gov.uk';

//Support Contact details on emails
config.smtp.support = {
  email: 'enquiries@environment-agency.gov.uk',
  UKPhone: '03708 506 506',
  PhoneFromAbroad: '00 44 1709 389 201',
  MiniCommNumber: '03702 422 549'
};

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
  'FILEUPLOADCOMPLETE': BASEURL.PROTOCOL + BASEURL.SERVER + BASEURL.PORT + '/data-exchange/complete',
  'ERRORCHECKING': 'error_checking',
  'ERRORSENDING': 'error_sending'
};

config.API.STATUS_CODES = {
  OK: 200
};

//DEP specific configuration
config.dep = {
  returnTypeRulesLink: 'http://data-returns-help.herokuapp.com/help/detailed-guides/return-type-rules'
};

// Google Analytics configuration.
config.useGoogleAnalytics = true;
config.googleTagManagerId = process.env.DRF_TAG_MANAGER_ID || 'GTM-TEST';

// Publish the configuration.
module.exports = config;