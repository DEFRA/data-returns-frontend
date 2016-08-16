"use strict";
const cacheHandler = require('../lib/cache-handler');
const userHandler = require('../lib/user-handler');
const redisKeys = require('../lib/redis-keys');
const merge = require('merge');
const errorHandler = require('../lib/error-handler');

module.exports = {
    /*
     * http GET handler for /correction/table
     */
    getHandler: function (request, reply) {
        var sessionID = userHandler.getSessionID(request);
        var fileUuid = request.query.uuid;
        console.log(`Loading correction table. Session: ${sessionID}, File: ${fileUuid}`);
        if (fileUuid) {
            cacheHandler.getJsonValue(redisKeys.ERROR_PAGE_METADATA.compositeKey([sessionID, fileUuid]))
                .then(function (fileData) {
                    let metadata = merge.recursive(fileData, {
                        errorSummary: errorHandler.render(900, {filename: fileData.name})
                    });
                    reply.view('data-returns/correction-table', metadata);
                });
        } else {
            reply.redirect('/file/choose');
        }
    }
};