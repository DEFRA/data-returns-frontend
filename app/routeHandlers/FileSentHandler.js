"use strict";
var userHandler = require('../lib/user-handler');
const winston = require("winston");

/*
 * HTTP GET Handler for /file/sent
 */
module.exports.getHandler = function (request, reply) {
    var sessionID = userHandler.getSessionID(request);
    userHandler.getUserMail(sessionID).then(function (userMail) {
        //get the original file name the user uploaded from the cache
        reply.view('data-returns/file-sent', { userEmail: userMail });
        userHandler.deleteSession(request, reply);
    }).catch(function (err) {
        winston.error(err);
    });
};