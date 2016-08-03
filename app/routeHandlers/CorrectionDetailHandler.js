"use strict";
var cacheHandler = require('../lib/cache-handler');
var utils = require('../lib/utils');
var detailsHandler = require('../api-handlers/multiple-error-helper');
var errorHandler = require('../lib/error-handler');
var errBit = require('../lib/errbitErrorMessage');
var redisKeys = require('../lib/redis-keys');

module.exports = {
    /*
     * HTTP GET Handler for /correction/detail route
     */
    getHandler: function (request, reply) {
        let sessionID = utils.base64Decode(request.state['data-returns-id']);
        var fileUuid = request.query.uuid;
        let errorID = request.query.id;

        if (sessionID !== null && fileUuid !== null && errorID !== null) {
            console.log(`Loading correction details. Session: ${sessionID}, File: ${fileUuid}, ErrorId: ${errorID}`);
            const fileDataKey = redisKeys.ERROR_PAGE_METADATA.compositeKey([sessionID, fileUuid]);
            const detailsKey = redisKeys.CORRECTION_DETAIL.compositeKey([sessionID, fileUuid, errorID]);

            var fileData = null;
            cacheHandler.getValue(fileDataKey)
                .then(JSON.parse)
                .then(data => fileData = data)
                .then(function () {
                    return cacheHandler.getValue(detailsKey).then(JSON.parse);
                })
                .then(function (correctionDetail) {
                    console.log(`Getting error details. Session: ${sessionID}, File: ${fileUuid}, ErrorId: ${errorID}`);
                    var errorDetails = detailsHandler.getErrorDetails(correctionDetail);
                    //get the first error and extract basic error details
                    var firstError = errorDetails[0];
                    var errorCode = firstError.errorCode;
                    var columnName = firstError.columnName;
                    var errorSummaryData = {
                        filename: fileData.name,
                        Correction: false,
                        CorrectionDetails: true,
                        CorrectionMoreHelp: true,
                        columnName: columnName,
                        errorCode: errorCode,
                        MoreHelpLink: firstError.helpReference
                    };
                    var errorSummary = errorHandler.render(errorCode, errorSummaryData, firstError.errorMessage);

                    reply.view('data-returns/correction-detail', {
                        uuid: fileUuid,
                        fileName: fileData.name,
                        columnName: firstError.columnName,
                        errorSummary: errorSummary,
                        errorCode: errorCode,
                        data: errorDetails
                    });
                }).catch(function (err) {
                    var msg = new errBit.errBitMessage(err, __filename, 'getHandler', err.stack);
                    console.error(msg);
                });
        } else {
            reply.redirect('/file/choose');
        }
    }
};