"use strict";
let userHandler = require('../../lib/user-handler');
const winston = require("winston");
/*
 * HTTP GET Handler for /file/sent
 */
module.exports.getHandler = function (request, reply) {

    let sessionID = userHandler.getSessionID(request);

    return userHandler.getUserMail(sessionID)
        .then(function(userMail) {
            userHandler.emptyUploadList(sessionID);
            return userMail;
        })
        .then(function(userMail) {
            reply.view('data-returns/file-sent', { userEmail: userMail });
            return;
        })
        .catch(function(err) {
            winston.error(err);
            reply.redirect('/email');
            return;
        });

};
