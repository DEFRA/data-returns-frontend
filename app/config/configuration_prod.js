'use strict';

/*
 * Settings for the 'production' environment.
 */
var config = require('./configuration_global');

// Set a meaningful name for this environment.
config.env = 'prod';

// In production we *do* want to use Google Analytics.
config.useGoogleAnalytics = true;

/* SMTP Prod Configuration */
config.smtp = config.smtp || {};
config.smtp.host = 'smtp.sendgrid.net';
config.smtp.port = 587;
config.smtp.ignoreTLS = true;
config.smtp.username = process.env.smtpuser;
config.smtp.password = process.env.smtppw;
config.smtp.fromEmailAddress = 'noreply@environment-agency.gov.uk';
config.smtp.useFooter = false;

// mail catcher config
// Set config.smtp.useMailCatcher = true; to use http://mailcatcher.me/
config.smtp.useMailCatcher = false; // set to false on AWS servers
config.smtp.mailcatcher.host = '127.0.0.1';
config.smtp.mailcatcher.port = 1025;
config.smtp.mailcatcher.ignoreTLS = true;

//Support Contact details on emails
config.smtp.support = {
    email: 'enquiries@environment-agency.gov.uk',
    UKPhone: '03708 506 506',
    PhoneFromAbroad: '00 44 1709 389 201',
    MiniCommNumber: '03702 422 549'
};

// CSV Validation
config.CSV = {
    validate: true,
    VIRUS_SCAN: true,
    ignoreScanFailure: false,
    maxFileSizeMb: 2
};

/* cache configuration */
config.redis = {
    clientOptions: {
        host: '10.208.7.112',
        port: 6379
    }
};

// API Endpoints

var BASEURL = {
    PROTOCOL: 'http://',
    SERVER: 'internal-EADRASLB01-1716219104.eu-west-1.elb.amazonaws.com',
    PORT: 9020
};

config.API = {};
config.API.endpoints = {
    'FILEUPLOAD': BASEURL.PROTOCOL + BASEURL.SERVER + BASEURL.PORT + '/data-exchange/upload',
    'FILEUPLOADCOMPLETE': BASEURL.PROTOCOL + BASEURL.SERVER + BASEURL.PORT + '/data-exchange/complete',
    'CONTROLLEDLISTS': BASEURL.PROTOCOL + BASEURL.SERVER + BASEURL.PORT + '/data-exchange/controlled-list'
};

config.API.STATUS_CODES = {
    OK: 200
};

//DEP specific configuration
config.dep = {
    returnTypeRulesLink: 'http://data-returns-help.herokuapp.com'
};

// Google Analytics configuration.
config.useGoogleAnalytics = true;
config.googleTagManagerId = process.env.DRF_TAG_MANAGER_ID || 'GTM-TEST';

config.compressCSS = true;

// html view cache control
config.html = {
    cached: true
};
/*
 * Application logging configuration
 */
config.logging = {
    "level": "warn",
    "errbit": {
        "enabled": true,
        "level": "error",
        "apiKey": process.env.ERRBIT_API_KEY,
        "appName": 'Data-Returns Front End (AWS Production)'
    }
};

// Publish the configuration.
module.exports = config;

