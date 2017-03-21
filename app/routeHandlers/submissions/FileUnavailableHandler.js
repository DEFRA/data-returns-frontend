"use strict";
const winston = require("winston");
const lodash = require("lodash");
let userHandler = require('../../lib/user-handler');

/*
 *  HTTP GET handler for /file/unavailable
 *  @Param request
 *  @Param reply
 */
module.exports.getHandler = function (request, reply) {
    let sessionID = userHandler.getSessionID(request);

    if (request.query.redirect) {
        if (lodash.isNil(sessionID)) {
            winston.info("Redirect without session.");
            userHandler.newUserSession(request, reply)
                .then(() => reply.redirect(request.query.redirect))
                .catch((err) => {
                    winston.error("Error creating a new session", err);
                    reply.redirect('/failure');
                });
        } else {
            winston.info("Redirect with session.");
            reply.redirect(request.query.redirect);
        }
    } else {
        reply.view('data-returns/file-unavailable');
    }
};