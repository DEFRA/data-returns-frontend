"use strict";
var cacheHandler = require('../lib/cache-handler');
var userHandler = require('../lib/user-handler');
var redisKeys = require('../lib/redis-keys');

module.exports = {
    /*
     * HTTP GET Handler for the /file/confirm route
     * @Param request
     * @param reply
     */
    getHandler: function (request, reply) {
        var sessionID = userHandler.getSessionID(request);
        var key = redisKeys.UPLOADED_FILES.compositeKey(sessionID);

        cacheHandler.arrayGet(key).then(function(uploads) {
            reply.view('data-returns/confirm-your-file', { "files": uploads });
        }).catch(function() {
            console.log("Unable to retrieve stored uploads array.");
            reply.redirect('data-returns/failure');
        });
    },
    /*
     * HTTP POST Handler for the /file/confirm route
     * @Param request
     * @param reply
     * Redirects the current page
     */
    postHandler: function (request, reply) {
        reply.redirect('data-returns/failure');
    }
};