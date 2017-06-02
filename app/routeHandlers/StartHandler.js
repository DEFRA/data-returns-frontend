'use strict';
const userHandler = require('../lib/user-handler');
const winston = require('winston');

module.exports = {
    /*
     *  HTTP POST handler for '/start' route
     *  @Param request
     *  @Param reply
     */
    postHandler: function (request, reply) {
        reply.redirect('/file/choose');
    },
    /*
     * get handler for '/start' route
     */
    getHandler: function (request, reply) {
        userHandler.newUserSession(request, reply)
            .then(() => reply.view('data-returns/start'))
            .catch((e) => {
                winston.error(e);
                reply.redirect('/failure');
            });
    },
    /*
     * This is used to check we have been able to write a session cookie
     * before redirecting to the file upload page
     */
    continueHandler: function (request, reply) {
        if (userHandler.getSessionID(request)) {
            reply.redirect('/file/choose');
        } else {
            reply.redirect('/guidance/no-cookie');
        }
    }
};
