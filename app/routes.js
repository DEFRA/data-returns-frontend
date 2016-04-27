
'use strict';
var config = require('./config/configuration_' + (process.env.NODE_ENV || 'local'));
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
 
  {
    method: 'GET',
    path: '/',
    handler: function (request, reply) {//IndexHandler.redirectToIndex
      reply.redirect('/01-start/01-start');
    }
  },
  
  {
    method: 'GET',
    path: '/index',
    handler: function (request, reply) {//BasicTemplateHandler.getHandler
      reply.redirect('/01-start/01-start');
    }
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
  /*{
   method: 'GET',
   path: '/02-send-your-data/01-choose-your-file',
   config: {plugins: {
   'hapi-io': 'get-status'
   }},
   handler: function (request, reply) {
   var io = request.plugins['hapi-io'];
   BasicTemplateHandler.getHandler(request, reply);
   if (io) {
   var socket = io.socket;
   socket.emit('upload-status', 'Server says "Processing complete"');
   // Do something with socket
   }
   
   }
   },*/
  {
    method: 'POST',
    path: '/02-send-your-data/01-choose-your-file',
    config: {
      payload: {
        maxBytes: config.CSV.maxfilesize,
        timeout: false, //90 * 1000, // 90 seconds to allow for max file size 
        output: 'file',
        parse: true,
        uploads: config.upload.path
      }
    },
    handler: function (request, reply) {
      O2O1Handler.postHandler(request, reply);
    }
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
    config: {
      plugins: {
        'hapi-io': 'get-status'
      }
    },
    handler: function (request, reply) {
      O2O9Handler.getHandler(request, reply);
    }
  },
  {
    method: 'GET',
    path: '/02-send-your-data/10-error-detail',
    handler: O21OHandler.getHandler
  }
];

