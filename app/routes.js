
'use strict';
var config = require('./config/configuration_' + (process.env.NODE_ENV || 'local'));
var BasicTemplateHandler = require('./routeHandlers/BasicTemplateHandler');
var StartHandler = require('./routeHandlers/StartHandler');
var ChooseFileHandler = require('./routeHandlers/ChooseFileHandler');
var ConfirmFileHandler = require('./routeHandlers/ConfirmFileHandler');
var EmailHandler = require('./routeHandlers/EmailHandler');
var PinHandler = require('./routeHandlers/PinHandler');
var FileSendHandler = require('./routeHandlers/FileSendHandler');
var FileCheckHandler = require('./routeHandlers/FileCheckHandler');
var FileSentHandler = require('./routeHandlers/FileSentHandler');
var CorrectionTableHandler = require('./routeHandlers/CorrectionTableHandler');
var CorrectionDetailHandler = require('./routeHandlers/CorrectionDetailHandler');

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
  /*
   * Redirect to the start for no valid routes 
   */
  {
    method: '*',
    path: '/{p*}', // catch-all path
    handler: function (request, reply) {
      reply.redirect('/start');
    }
  },
  {
    method: 'GET',
    path: '/',
    handler: function (request, reply) {
      reply.redirect('/start');
    }
  },
  {
    method: 'GET',
    path: '/index',
    handler: function (request, reply) {
      reply.redirect('/start');
    }
  },
  // Start page.
  {
    method: 'GET',
    path: '/start',
    handler: StartHandler.getHandler
  },
  {
    method: 'POST',
    path: '/start',
    handler: StartHandler.postHandler
  },
  // /file/choose
  {
    method: 'GET',
    path: '/file/choose',
    handler: ChooseFileHandler.getHandler
  },
  {
    method: 'POST',
    path: '/file/choose',
    config: {
      payload: {
        maxBytes: config.CSV.maxfilesize,
        timeout: false,
        output: 'file',
        parse: true,
        uploads: config.upload.path
      }
    },
    handler: function (request, reply) {
      ChooseFileHandler.postHandler(request, reply);
    }
  },
  // /file/confirm
  {
    method: 'GET',
    path: '/file/confirm',
    handler: ConfirmFileHandler.getHandler
  },
  {
    method: 'POST',
    path: '/file/confirm',
    handler: ConfirmFileHandler.postHandler
  },
  /*
   * /file/check 
   */
  {
    method: 'GET',
    path: '/file/check',
    handler: FileCheckHandler.getHandler
  },
  // /email 
  {
    method: 'GET',
    path: '/email',
    handler: EmailHandler.getHandler
  },
  {
    method: 'POST',
    path: '/email',
    handler: EmailHandler.postHandler
  },
  // /pin
  {
    method: 'GET',
    path: '/pin',
    handler: PinHandler.getHandler
  },
  {
    method: 'POST',
    path: '/pin',
    handler: PinHandler.postHandler
  },
  // /file/send
  {
    method: 'GET',
    path: '/file/send',
    handler: FileSendHandler.getHandler
  },
  {
    method: 'POST',
    path: '/file/send',
    handler: FileSendHandler.postHandler
  },
  // /failure
  {
    method: 'GET',
    path: '/failure',
    handler: BasicTemplateHandler.getHandler
  },
  // /file/sent
  {
    method: 'GET',
    path: '/file/sent',
    handler: FileSentHandler.getHandler
  },
  
  // /correction/table
  {
    method: 'GET',
    path: '/correction/table',
    config: {
      plugins: {
        'hapi-io': 'get-status'
      }
    },
    handler: function (request, reply) {
      CorrectionTableHandler.getHandler(request, reply);
    }
  },
  // /correction/detail
  {
    method: 'GET',
    path: '/correction/detail',
    handler: CorrectionDetailHandler.getHandler
  }
];

