"use strict";
var cacheHandler = require('../lib/cache-handler');
var userHandler = require('../lib/user-handler');
var redisKeys = require('../lib/redis-keys');

module.exports = {
    /*
     * http GET handler for /correction/table
     */
    getHandler: function (request, reply) {
        var sessionID = userHandler.getSessionID(request);
        var fileUuid = request.query.uuid;
        console.log(`Loading correction table. Session: ${sessionID}, File: ${fileUuid}`);
        if (fileUuid) {
            cacheHandler.getValue(redisKeys.ERROR_PAGE_METADATA.compositeKey([sessionID, fileUuid]))
                .then(JSON.parse)
                .then(function (fileData) {
                    reply.view('data-returns/correction-table', fileData);
                });
        } else {
            reply.redirect('/file/choose');
        }
    }
};