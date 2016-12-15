"use strict";
const winston = require("winston");
const cacheHandler = require('../../lib/cache-handler');
const userHandler = require('../../lib/user-handler');
const redisKeys = require('../../lib/redis-keys');
const lodash = require("lodash");
const errorHandler = require('../../lib/error-handler');

module.exports = {
    /*
     * http GET handler for /correction/table
     */
    getHandler: function (request, reply) {
        var sessionID = userHandler.getSessionID(request);
        var fileUuid = request.query.uuid;
        winston.info(`Loading correction table. Session: ${sessionID}, File: ${fileUuid}`);
        if (fileUuid) {
            let key = redisKeys.ERROR_PAGE_METADATA.compositeKey([sessionID, fileUuid]);
            cacheHandler.getJsonValue(key).then(function (fileData) {
                if (fileData && fileData.name) {
                    let metadata = lodash.merge({}, fileData, {
                        errorSummary: errorHandler.render(900, {filename: fileData.name})
                    });
                    reply.view('data-returns/correction-table', metadata);
                } else {
                    reply.redirect('/file/choose');
                }
            }).catch(function() {
                reply.redirect('/file/choose');
            });
        } else {
            reply.redirect('/file/choose');
        }
    }
};