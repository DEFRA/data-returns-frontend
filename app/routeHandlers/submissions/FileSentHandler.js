'use strict';
const userHandler = require('../../lib/user-handler');
/*
 * HTTP GET Handler for /file/sent
 */
module.exports.getHandler = function (request, reply) {
    const sessionID = userHandler.getSessionID(request);
    let userEmail = null;

    userHandler.getUserMail(sessionID)
        .then(userMail => {
            userEmail = userMail;
            return userHandler.emptyUploadList(sessionID);
        })
        .then(() => reply.view('data-returns/file-sent', { userEmail: userEmail }))
        .catch(() => reply.redirect('/email'));
};
