"use strict";
var userHandler = require('../lib/user-handler');
//path: '/start',


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
        // Generate a new session
        userHandler.newUserSession(request, reply);
        reply.view('data-returns/start');
    }
};