"use strict";
let userHandler = require('../lib/user-handler');

/*
 * HTTP GET Handler for /file/sent
 */
module.exports.getHandler = function (request, reply) {
    let sessionID = userHandler.getSessionID(request);
    userHandler.getUserMail(sessionID).then(function (userMail) {
        //get the original file name the user uploaded from the cache
        reply.view('data-returns/file-sent', { userEmail: userMail });
        userHandler.emptyUploadList(request, reply);
    }).catch(function() {
        // Redirect to the email page if there is no email address for this user (likely they attempted navigating
        // here directly)
        reply.redirect('/email');
    });
};