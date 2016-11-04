'use strict';
const winston = require("winston");
const config = require('./lib/configuration-handler.js').Configuration;

var basicTemplateHandler = require('./routeHandlers/BasicTemplateHandler');
var startHandler = require('./routeHandlers/StartHandler');

// Submission route handlers
var chooseFileHandler = require('./routeHandlers/submissions/ChooseFileHandler');
var confirmFileHandler = require('./routeHandlers/submissions/ConfirmFileHandler');
var emailHandler = require('./routeHandlers/submissions/EmailHandler');
var pinHandler = require('./routeHandlers/submissions/PinHandler');
var fileSendHandler = require('./routeHandlers/submissions/FileSendHandler');
var fileSentHandler = require('./routeHandlers/submissions/FileSentHandler');
var correctionTableHandler = require('./routeHandlers/submissions/CorrectionTableHandler');
var correctionDetailHandler = require('./routeHandlers/submissions/CorrectionDetailHandler');
var fileInvalidHandler = require('./routeHandlers/submissions/FileInvalidHandler');

// Reference material lookup handlers
var listHandler = require('./routeHandlers/lookup/ListHandler');
var eaIdLookupHandler = require('./routeHandlers/lookup/EaIdLookupHandler');


var contentReviewHandler = require('./routeHandlers/ContentReviewHandler');

let handlers = [
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
    // /file/invalid
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
                maxBytes: config.get('csv.maxFileSizeMb') * Math.pow(2, 20),
                timeout: false,
                output: "file",
                parse: true,
                uploads: config.get('upload.path'),
                // Fail action is set to ignore so that we can handle errors inside ChooseFileHandler
                failAction: "ignore"
            }
        },
        handler:  chooseFileHandler.postHandler
    },
    // /file/confirm
    {
        method: 'GET',
        path: '/file/confirm',
        handler: confirmFileHandler.getHandler
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

    // Controlled list handlers
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
    },

    // EA_ID lookup tool#
    {
        method: 'GET',
        path: '/lookup',
        handler: eaIdLookupHandler.routeHandler
    },


    // /failure
    {
        method: 'GET',
        path: '/failure',
        handler: basicTemplateHandler.getHandler
    }
];

if (process.env.NODE_ENV !== "production") {
    // Add handler for content review
    handlers.push({
        method: 'GET',
        path: '/content/review',
        handler: contentReviewHandler.getHandler
    });

    // Add handler for logger capability test
    handlers.push({
        method: 'GET',
        path: '/logging/test',
        handler: function (request, reply) {
            winston.debug("Test debug logging");
            winston.info("Test info logging");
            winston.warn("Test warn logging");
            winston.error("Test error message", new Error("Test error logging"));

            let Request = require('request');
            let apiData = {url: config.get('api.endpoints.testLogging')};
            Request.get(apiData, function (err, httpResponse) {
                if (err) {
                    reply({status: "failed", "backend": err});
                } else {
                    reply({status: "ok", "backend": httpResponse});
                }
            });
        }
    });
}

module.exports = handlers;