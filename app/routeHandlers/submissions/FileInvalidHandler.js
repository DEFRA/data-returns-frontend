'use strict';
const cacheHandler = require('../../lib/cache-handler');
const userHandler = require('../../lib/user-handler');
const redisKeys = require('../../lib/redis-keys');
const errorHandler = require('../../lib/error-handler');
const utils = require('../../lib/utils');

/*
 *  HTTP GET handler for /file/invalid
 *  @Param request
 *  @Param reply
 */
module.exports.getHandler = function (request, reply) {
    const sessionID = userHandler.getSessionID(request);
    const uuid = request.query.uuid || 'null';

    redisKeys.ERROR_PAGE_METADATA.compositeKey([sessionID, uuid])
        .then(cacheHandler.getJsonValue)
        .then((fileData) => {
            reply.view('data-returns/file-invalid', {
                errorCode: 'DR' + utils.pad(fileData.status.errorCode, 4),
                errorSummary: errorHandler.render(fileData.status.errorCode, {}, 'Unrecognised error')
            });
        })
        .catch(() =>
            // Show file-unavailable page if the user hasn't uploaded any files
            reply.view('data-returns/file-unavailable')
        );
};
