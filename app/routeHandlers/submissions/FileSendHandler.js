"use strict";
const config = require('../../lib/configuration-handler.js').Configuration;
const winston = require("winston");
const userHandler = require('../../lib/user-handler');
const completionHandler = require('../../api-handlers/completion-handler');
const smtpHandler = require('../../lib/smtp-handler');
const errorHandler = require('../../lib/error-handler');

module.exports = {
    /*
     * HTTP GET handler for gets for /file/send
     * @param {type} request
     * @param {type} reply
     *
     */
    getHandler: function (request, reply) {
        let sessionID = userHandler.getSessionID(request);
        userHandler.getUploads(sessionID).then(function (uploads) {
            if (uploads && uploads.length > 0) {
                reply.view('data-returns/send-your-file', {"files": uploads});
            } else {
                // Show file-unavailable page if the file uploads array is empty
                reply.view('data-returns/file-unavailable');
            }
        }).catch(function () {
            // Show file-unavailable page if the user hasn't uploaded any files
            reply.view('data-returns/file-unavailable');
        });
    },

    /*
     * HTTP POST handler for gets for /file/send
     * @param {type} request
     * @param {type} reply
     *
     */
    postHandler: function (request, reply) {
        let sessionID = userHandler.getSessionID(request);

        let exceptionHandler = function () {
            let errorMessage = errorHandler.render(3000, {mailto: config.get('feedback.mailto')});
            reply.view('data-returns/failure', {'errorMessage': errorMessage});
        };

        userHandler.getUserMail(sessionID).then(function (userMail) {
            userHandler.getUploads(sessionID).then(function (uploads) {
                let callbacks = 0;
                let onFileSubmitted = function () {
                    if (++callbacks === uploads.length) {
                        winston.info("All uploads complete, sending confirmation emails");
                        let metadata = {
                            "email": userMail,
                            "files": uploads
                        };

                        smtpHandler.sendConfirmationEmail(metadata)
                            .then(() => {
                                // Increment the count of uploads using the current pin number
                                return userHandler.modifyUser(sessionID, (user) => {
                                    if (user) {
                                        user.uploadCount++;
                                    }
                                });
                            })
                            .then(() => reply.redirect('/file/sent').rewritable(true))
                            .catch((err) => {
                                winston.error(err);
                                reply.redirect('/failure');
                            });

                    }
                };

                for (let upload of uploads) {
                    let fileKey = upload.status.server.uploadResult.fileKey;
                    completionHandler.confirmFileSubmission(fileKey, userMail, upload.name)
                        .then(onFileSubmitted)
                        .catch(exceptionHandler);
                }
            }).catch(exceptionHandler);
        }).catch(() => reply.redirect('/email'));
    }
};