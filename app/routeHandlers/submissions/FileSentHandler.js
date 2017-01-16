"use strict";
let userHandler = require('../../lib/user-handler');
const winston = require("winston");
/*
 * HTTP GET Handler for /file/sent
 */
module.exports.getHandler = function (request, reply) {

    let sessionID = userHandler.getSessionID(request);
    let userEmail = null;

    userHandler.getUserMail(sessionID)
        .then(userMail => {
            userEmail = userMail;
            return userHandler.emptyUploadList(sessionID);
        })
        .then(() => reply.view('data-returns/file-sent', { userEmail: userEmail }))
        .catch(err => {
            winston.error(err);
            reply.redirect('/email');
        });

};