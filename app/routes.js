'use strict';
var config = require('./config/configuration_' + (process.env.NODE_ENV || 'local'));
var basicTemplateHandler = require('./routeHandlers/BasicTemplateHandler');
var startHandler = require('./routeHandlers/StartHandler');
var chooseFileHandler = require('./routeHandlers/ChooseFileHandler');
var fileInvalidHandler = require('./routeHandlers/FileInvalidHandler');
var confirmFileHandler = require('./routeHandlers/ConfirmFileHandler');
var emailHandler = require('./routeHandlers/EmailHandler');
var pinHandler = require('./routeHandlers/PinHandler');
var fileSendHandler = require('./routeHandlers/FileSendHandler');
var fileCheckHandler = require('./routeHandlers/FileCheckHandler');
var fileSentHandler = require('./routeHandlers/FileSentHandler');
var correctionTableHandler = require('./routeHandlers/CorrectionTableHandler');
var correctionDetailHandler = require('./routeHandlers/CorrectionDetailHandler');
var listHandler = require('./routeHandlers/ListHandler');

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
        handler: startHandler.getHandler
    },
    {
        method: 'POST',
        path: '/start',
        handler: startHandler.postHandler
    },
    // /file/error
    {
        method: 'GET',
        path: '/file/invalid',
        handler: fileInvalidHandler.getHandler
    },
    // /file/choose
    {
        method: 'GET',
        path: '/file/choose',
        handler: chooseFileHandler.getHandler
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
            chooseFileHandler.postHandler(request, reply);
        }
    },
    // /file/confirm
    {
        method: 'GET',
        path: '/file/confirm',
        handler: confirmFileHandler.getHandler
    },
    {
        method: 'POST',
        path: '/file/confirm',
        handler: confirmFileHandler.postHandler
    },
    /*
     * /file/check
     */
    {
        method: 'GET',
        path: '/file/check',
        handler: fileCheckHandler.getHandler
    },
    // /email
    {
        method: 'GET',
        path: '/email',
        handler: emailHandler.getHandler
    },
    {
        method: 'POST',
        path: '/email',
        handler: emailHandler.postHandler
    },
    // /pin
    {
        method: 'GET',
        path: '/pin',
        handler: pinHandler.getHandler
    },
    {
        method: 'POST',
        path: '/pin',
        handler: pinHandler.postHandler
    },
    // /file/send
    {
        method: 'GET',
        path: '/file/send',
        handler: fileSendHandler.getHandler
    },
    {
        method: 'POST',
        path: '/file/send',
        handler: fileSendHandler.postHandler
    },
    // /failure
    {
        method: 'GET',
        path: '/failure',
        handler: basicTemplateHandler.getHandler
    },
    // /file/sent
    {
        method: 'GET',
        path: '/file/sent',
        handler: fileSentHandler.getHandler
    },

    // /correction/table
    {
        method: 'GET',
        path: '/correction/table',
        handler: correctionTableHandler.getHandler
    },
    // /correction/detail
    {
        method: 'GET',
        path: '/correction/detail',
        handler: correctionDetailHandler.getHandler
    },
    {
        method: 'GET',
        path: '/controlled-lists',
        handler: listHandler.getHandler
    },
    {
        method: 'GET',
        path: '/display-list',
        handler: listHandler.getDisplayHandler
    },
    {
        method: 'POST',
        path: '/display-list-search',
        handler: listHandler.getDisplayHandlerWithSearch
    },
    {
        method: 'GET',
        path: '/csv/{list*}',
        handler: listHandler.getCSVHandler
    }
];

