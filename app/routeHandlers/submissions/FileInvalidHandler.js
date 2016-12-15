"use strict";
var cacheHandler = require('../../lib/cache-handler');
var userHandler = require('../../lib/user-handler');
var redisKeys = require('../../lib/redis-keys');
var errorHandler = require('../../lib/error-handler');
const utils = require('../../lib/utils');

/*
 *  HTTP GET handler for /file/error
 *  @Param request
 *  @Param reply
 */
module.exports.getHandler = function (request, reply) {
    let sessionID = userHandler.getSessionID(request);
    let uuid = request.query.uuid || "null";
    var key = redisKeys.ERROR_PAGE_METADATA.compositeKey([sessionID, uuid]);
    cacheHandler.getJsonValue(key).then(function (fileData) {
        reply.view('data-returns/file-invalid', {
            errorCode: "DR" + utils.pad(fileData.status.errorCode, 4),
            errorSummary: errorHandler.render(fileData.status.errorCode, {}, "Unrecognised error")
        });
    }).catch(function() {
        // Show file-unavailable page if the user hasn't uploaded any files
        reply.view('data-returns/file-unavailable');
    });
};