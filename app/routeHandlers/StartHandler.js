"use strict";
const userHandler = require('../lib/user-handler');
const winston = require("winston");

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
            .catch(winston.error);
    }
};
