"use strict";

const config = require('../../lib/configuration-handler.js').Configuration;
const winston = require("winston");
var userHandler = require('../../lib/user-handler');
var completionHandler = require('../../api-handlers/completion-handler');
var smtpHandler = require('../../lib/smtp-handler');
var errorHandler = require('../../lib/error-handler');

module.exports = {
    /*
     * HTTP GET handler for gets for /file/send
     * @param {type} request
     * @param {type} reply
     *
     */
    getHandler: function (request, reply) {
        var sessionID = userHandler.getSessionID(request);
        userHandler.getUploads(sessionID).then(function(uploads) {
            if (uploads && uploads.length > 0) {
                reply.view('data-returns/send-your-file', {"files":  uploads});
            } else {
                // Show file-unavailable page if the file uploads array is empty
                reply.view('data-returns/file-unavailable');
            }
        }).catch(function() {
            winston.info("Unable to retrieve stored uploads array.");
            reply.redirect('data-returns/failure');
        });
    },

    /*
     * HTTP POST handler for gets for /file/send
     * @param {type} request
     * @param {type} reply
     *
     */
    postHandler: function (request, reply) {
        var sessionID = userHandler.getSessionID(request);

        var exceptionHandler = function() {
            var errorMessage = errorHandler.render(3000, {mailto: config.get('feedback.mailto')});
            reply.view('data-returns/failure', {'errorMessage': errorMessage});
        };

        userHandler.getUserMail(sessionID).then(function (userMail) {
            userHandler.getUploads(sessionID).then(function(uploads) {
                let callbacks = 0;
                var onFileSubmitted = function () {
                    if (++callbacks === uploads.length) {
                        winston.info("All uploads complete, sending confirmation emails");
                        var metadata = {
                            "email": userMail,
                            "files": uploads
                        };

                        smtpHandler.sendConfirmationEmail(metadata).then(function () {
                            // Increment the count of uploads using the current pin number
                            // TODO: This does not take multiple uploads into account - not sure if it really should?
                            userHandler.incrementUploadCount(sessionID);
                        }).then(function () {
                            reply.redirect('/file/sent').rewritable(true);
                        });
                    }
                };

                for (let upload of uploads) {
                    var fileKey = upload.status.server.uploadResult.fileKey;
                    completionHandler.confirmFileSubmission(fileKey, userMail, upload.name)
                        .then(onFileSubmitted)
                        .catch(exceptionHandler);
                }
            }).catch(exceptionHandler);
        });
    }
};