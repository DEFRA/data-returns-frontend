"use strict";
const winston = require("winston");
var cacheHandler = require('../lib/cache-handler');
var userHandler = require('../lib/user-handler');
var detailsHandler = require('../api-handlers/multiple-error-helper');
var errorHandler = require('../lib/error-handler');
var redisKeys = require('../lib/redis-keys');

module.exports = {
    /*
     * HTTP GET Handler for /correction/detail route
     */
    getHandler: function (request, reply) {
        let sessionID = userHandler.getSessionID(request);
        var fileUuid = request.query.uuid;
        let errorID = request.query.id;

        if (sessionID !== null && fileUuid !== null && errorID !== null) {
            winston.info(`Loading correction details. Session: ${sessionID}, File: ${fileUuid}, ErrorId: ${errorID}`);
            const fileDataKey = redisKeys.ERROR_PAGE_METADATA.compositeKey([sessionID, fileUuid]);
            const detailsKey = redisKeys.CORRECTION_DETAIL.compositeKey([sessionID, fileUuid, errorID]);

            var fileData = null;
            cacheHandler.getJsonValue(fileDataKey)
                .then(data => fileData = data)
                .then(function () {
                    return cacheHandler.getJsonValue(detailsKey);
                })
                .then(function (correctionDetail) {
                    winston.info(`Getting error details. Session: ${sessionID}, File: ${fileUuid}, ErrorId: ${errorID}`);
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
                    winston.error(err);
                });
        } else {
            reply.redirect('/file/choose');
        }
    }
};