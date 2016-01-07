/* global config */

'use strict';
var IndexHandler = require('./routeHandlers/indexHandler');
var BasicTemplateHandler = require('./routeHandlers/BasicTemplateHandler');
var O1O1Handler = require('./routeHandlers/O1O1Handler');
var O2O1Handler = require('./routeHandlers/O2O1Handler');
var O2O2Handler = require('./routeHandlers/O2O2Handler');
var O2O3Handler = require('./routeHandlers/O2O3Handler');
var O204Handler = require('./routeHandlers/O2O4Handler');
var O2O5Handler = require('./routeHandlers/O2O5Handler');
var O2O6Handler = require('./routeHandlers/O2O6Handler');
var O2O7Handler = require('./routeHandlers/O2O7Handler');
var O2O8Handler = require('./routeHandlers/O2O8Handler');
var InvalidCSVHandler = require('./routeHandlers/invalidCSVHandler');


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
  // TODO: Rename
  {
    method: 'GET',
    path: '/index',
    handler: BasicTemplateHandler.getHandler
  },
  // Start page.
  {
    method: 'GET',
    path: '/01-start/01-start',
    handler: BasicTemplateHandler.getHandler
  },
  {
    method: 'POST',
    path: '/01-start/01-start',
    handler: O1O1Handler.postHandler
  },
  // 01-Upload-Your-Data.
  {
    method: 'GET',
    path: '/02-send-your-data/01-upload-your-data',
    handler: BasicTemplateHandler.getHandler
  },
  {
    method: 'POST',
    path: '/02-send-your-data/01-upload-your-data',
    config: {
      payload: {
        maxBytes: 1 * Math.pow(2, 20), // 1 megabyte
        timeout: 20 * 1000, // 20 seconds
        output: 'file',
        parse: true
      }
    },
    handler: O2O1Handler.postHandler
  },
  // 02-Verify-Your-File.
  {
    method: 'GET',
    path: '/02-send-your-data/02-verify-your-file',
    handler: O2O2Handler.getHandler
  },
  {
    method: 'POST',
    path: '/02-send-your-data/02-verify-your-file',
    handler: O2O2Handler.postHandler
  },
  {
    method: 'GET',
    path: '/02-send-your-data/06-failure',
    handler: O2O6Handler.getHandler
  },
  // 03-Email.
  {
    method: 'GET',
    path: '/02-send-your-data/03-email',
    handler: O2O3Handler.getHandler
  },
  {
    method: 'POST',
    path: '/02-send-your-data/03-email',
    handler: O2O3Handler.postHandler
  },
  // 04-Authenticate.
  {
    method: 'GET',
    path: '/02-send-your-data/04-authenticate',
    handler: BasicTemplateHandler.getHandler
  },
  {
    method: 'POST',
    path: '/02-send-your-data/04-authenticate',
    handler: O204Handler.postHandler
  },
  // 05-Success.
  {
    method: 'GET',
    path: '/02-send-your-data/05-success',
    handler: O2O5Handler.getHandler
  },
  {
    method: 'POST',
    path: '/02-send-your-data/05-success',
    handler: O2O5Handler.postHandler
  },
  // 07-Failure (unrecoverable).
  {
    method: 'GET',
    path: '/02-send-your-data/07-failure',
    handler: O2O7Handler.getHandler
  },
  // 08-Done.
  {
    method: 'GET',
    path: '/02-send-your-data/08-done',
    handler: O2O8Handler.getHandler
  },
  // Help pages.
  {
    method: 'GET',
    path: '/05-help/01-help',
    handler: BasicTemplateHandler.getHandler
  },
  {
    method: 'GET',
    path: '/invalid_csv_file',
    handler: InvalidCSVHandler.getHandler
  }
];

