"use strict";
var cacheHandler = require('../lib/cache-handler');
var utils = require('../lib/utils');
var redisKeys = require('../lib/redis-keys');

/*
 *  HTTP GET handler for /file/error
 *  @Param request
 *  @Param reply
 */
module.exports.getHandler = function (request, reply) {
    var sessionID = utils.base64Decode(request.state['data-returns-id']);
    if (request.query.uuid) {
        console.log(`Retrieve validation errors for session ${sessionID} with uuid ${request.query.uuid}`);
        var key = redisKeys.ERROR_PAGE_METADATA.compositeKey([sessionID, request.query.uuid]);
        cacheHandler.getValue(key).then(JSON.parse).then(function (fileData) {
            reply.view('data-returns/file-invalid', fileData.correctionsData);
        });
    }
};