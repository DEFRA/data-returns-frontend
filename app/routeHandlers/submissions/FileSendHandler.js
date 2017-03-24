"use strict";
const winston = require("winston");
const userHandler = require('../../lib/user-handler');
const completionHandler = require('../../api-handlers/completion-handler');
const smtpHandler = require('../../lib/smtp-handler');

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
        }).catch((e) => {
            winston.error(e);
            reply.redirect("/failure");
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

        userHandler.getUserMail(sessionID).then(function (userMail) {
            userHandler.getUploads(sessionID).then(function (uploads) {
                let uploadJobs = uploads.map(upload => {
                    let fileKey = upload.status.server.uploadResult.fileKey;
                    return completionHandler.confirmFileSubmission(fileKey, userMail, upload.name);
                });

                Promise.all(uploadJobs).then(() => {
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
                }).catch(() => reply.redirect('/failure'));
            }).catch(() => reply.view('data-returns/file-unavailable'));
        }).catch(() => reply.redirect('/email'));
    }
};