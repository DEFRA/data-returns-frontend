"use strict";
var userHandler = require('../lib/user-handler');
var helpLinks = require('../config/dep-help-links');
const errbit = require("../lib/errbit-handler");

/*
 * HTTP GET Handler for /file/sent
 */
module.exports.getHandler = function (request, reply) {
    var sessionID = userHandler.getSessionID(request);
    userHandler.getUserMail(sessionID).then(function (userMail) {
        //get the original file name the user uploaded from the cache
        reply.view('data-returns/file-sent', {
            userEmail: userMail,
            EnvironmentAgencyHome: helpLinks.links.EnvironmentAgencyHome
        });
        userHandler.deleteSession(request, reply);
    }).catch(function (err) {
        errbit.notify(err);
    });
};