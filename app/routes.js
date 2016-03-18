/* global config */

'use strict';
var config = require('./config/configuration_' + (process.env.NODE_ENV || 'local'));
var IndexHandler = require('./routeHandlers/indexHandler');
var BasicTemplateHandler = require('./routeHandlers/BasicTemplateHandler');
var O1O1Handler = require('./routeHandlers/O1O1Handler');
var O2O1Handler = require('./routeHandlers/O2O1Handler');
var O2O2Handler = require('./routeHandlers/O2O2Handler');
var O2O3Handler = require('./routeHandlers/O2O3Handler');
var O204Handler = require('./routeHandlers/O2O4Handler');
var O2O5Handler = require('./routeHandlers/O2O5Handler');
var O2O6Handler = require('./routeHandlers/O2O6Handler');
var O2O8Handler = require('./routeHandlers/O2O8Handler');
var O2O9Handler = require('./routeHandlers/O2O9Handler');
var O21OHandler = require('./routeHandlers/O210Handler');

//var InvalidCSVHandler = require('./routeHandlers/invalidCSVHandler');
//var EmptyFileHandler = require('./routeHandlers/EmptyFileHandler');

// TODO: Add validation handlers so that user cannot "jump" to page without going through intended journey.
// TODO: Think about more / better logging.

module.exports = [
  // Static assets.
  {
    method: 'GET',
    path: '/public/{param*}',
    handler: {
      directory: {
        path: [
          'public/',
          'govuk_modules/govuk_template/assets',
          'govuk_modules/govuk_frontend_toolkit'
        ],
        etagMethod: 'hash' // Allows assets to be cached by the client.
      }
    }
  },
  // TODO: Make redirection environment-specific, and rename the index to "development" or similar.
  // Redirect for site root.
  {
    method: 'GET',
    path: '/',
    handler: IndexHandler.redirectToIndex
  },
  // Index page (visible in development only).
  // TODO: Remove
  {
    method: 'GET',
    path: '/index',
    handler: BasicTemplateHandler.getHandler
  },
  // Start page.
  {
    method: 'GET',
    path: '/01-start/01-start',
    handler: O1O1Handler.getHandler//BasicTemplateHandler.getHandler
  },
  {
    method: 'POST',
    path: '/01-start/01-start',
    handler: O1O1Handler.postHandler
  },
  // 01-Upload-Your-Data.
  {
    method: 'GET',
    path: '/02-send-your-data/01-choose-your-file',
    handler: O2O1Handler.getHandler//BasicTemplateHandler.getHandler
  },
  {
    method: 'POST',
    path: '/02-send-your-data/01-choose-your-file',
    config: {
      payload: {
        maxBytes: 2 * Math.pow(2, 20), // 2 megabytes 
        //TODO add large file check to validator as it is not handled.
        timeout: 60 * 1000, // 20 seconds
        output: 'file',
        parse: true,
        uploads: config.upload.path
      }
    },
    handler: O2O1Handler.postHandler
  },
  // 02-Verify-Your-File.
  {
    method: 'GET',
    path: '/02-send-your-data/02-confirm-your-file',
    handler: O2O2Handler.getHandler
  },
  {
    method: 'POST',
    path: '/02-send-your-data/02-confirm-your-file',
    handler: O2O2Handler.postHandler
  },
  {
    method: 'GET',
    path: '/02-send-your-data/06-check',
    handler: O2O6Handler.getHandler
  },
  // 03-confirm-your-email-address.
  {
    method: 'GET',
    path: '/02-send-your-data/03-confirm-your-email-address',
    handler: O2O3Handler.getHandler
  },
  {
    method: 'POST',
    path: '/02-send-your-data/03-confirm-your-email-address',
    handler: O2O3Handler.postHandler
  },
  // 04-enter-your-code.
  {
    method: 'GET',
    path: '/02-send-your-data/04-enter-your-code',
    handler: BasicTemplateHandler.getHandler
  },
  {
    method: 'POST',
    path: '/02-send-your-data/04-enter-your-code',
    handler: O204Handler.postHandler
  },
  // 05-Success.
  {
    method: 'GET',
    path: '/02-send-your-data/05-send-your-file',
    handler: O2O5Handler.getHandler
  },
  {
    method: 'POST',
    path: '/02-send-your-data/05-send-your-file',
    handler: O2O5Handler.postHandler
  },
  // 07-Failure (unrecoverable).
  {
    method: 'GET',
    path: '/02-send-your-data/07-failure',
    handler: BasicTemplateHandler.getHandler//O2O7Handler.getHandler
  },
  // 08-Done.
  {
    method: 'GET',
    path: '/02-send-your-data/08-file-sent',
    handler: O2O8Handler.getHandler
  },
  {
    method: 'GET',
    path: '/02-send-your-data/09-errors',
    handler: O2O9Handler.getHandler
  },
  {
    method: 'GET',
    path: '/02-send-your-data/10-error-detail',
    handler: O21OHandler.getHandler
  }
];

