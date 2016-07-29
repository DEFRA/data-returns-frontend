"use strict";
var userHandler = require('../lib/user-handler');
var completionHandler = require('../api-handlers/completion-handler');
var utils = require('../lib/utils.js');
var cacheHandler = require('../lib/cache-handler');
var config = require('../config/configuration_' + (process.env.NODE_ENV || 'local'));
var redisKeys = require('../lib/redis-keys');
var smtpHandler = require('../lib/smtp-handler');

module.exports = {
    /*
     * HTTP GET handler for gets for /file/send
     * @param {type} request
     * @param {type} reply
     *
     */
    getHandler: function (request, reply) {
        var sessionID = utils.base64Decode(request.state['data-returns-id']);
        var key = redisKeys.UPLOADED_FILES.compositeKey(sessionID);
        cacheHandler.client.lrange(key, 0, -1, function (error, uploads) {
            reply.view('data-returns/send-your-file', {"files":  uploads.map(JSON.parse)});
        });
    },

    /*
     * HTTP POST handler for gets for /file/send
     * @param {type} request
     * @param {type} reply
     *
     */
    postHandler: function (request, reply) {
        var sessionID = utils.base64Decode(request.state['data-returns-id']);
        var key = redisKeys.UPLOADED_FILES.compositeKey(sessionID);

        userHandler.getUserMail(sessionID).then(function (userMail) {
            cacheHandler.client.lrange(key, 0, -1, function (error, uploads) {
                let callbacks = 0;
                var onFileSubmitted = function () {
                    if (++callbacks === uploads.length) {
                        console.log("All uploads complete, sending confirmation emails");
                        var metadata = {
                            "email": userMail,
                            "files": uploads.map(JSON.parse)
                        };

                        // TODO: SESSION CLEANUP NEEDS TO BE BETTER THAN THIS!
                        smtpHandler.sendConfirmationEmail(metadata).then(function () {
                            // Increment the count of uploads using the current pin number
                            userHandler.incrementUploadCount(sessionID);
                        }).then(function () {
                            // delete the file uploaded
                            utils.deleteFile(sessionID);
                        }).then(function () {
                            //delete the upload results
                            cacheHandler.delete(redisKeys.BACKEND_UPLOAD_RESULT.compositeKey(sessionID));
                        }).then(function () {
                            reply.redirect('/file/sent').rewritable(true);
                        });
                    }
                };

                var errorHandler = function () {
                    var errorMessage = errorHandler.render(3000, {mailto: config.feedback.mailto});
                    reply.view('data-returns/failure', {'errorMessage': errorMessage});
                };

                for (let uploadStr of uploads) {
                    try {
                        var upload = JSON.parse(uploadStr);
                        var fileKey = upload.status.server.uploadResult.fileKey;

                        completionHandler.confirmFileSubmission(fileKey, userMail, upload.name)
                            .then(onFileSubmitted)
                            .catch(errorHandler);
                    } catch (e) {
                        errorHandler();
                        break;
                    }
                }
            });
        });
    }
};