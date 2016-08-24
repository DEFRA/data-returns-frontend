"use strict";
const winston = require("winston");
var cacheHandler = require('../lib/cache-handler');
var userHandler = require('../lib/user-handler');
var errorHandler = require('../lib/error-handler');
var redisKeys = require('../lib/redis-keys');
const merge = require('merge');

module.exports = {
    /*
     * HTTP GET Handler for /correction/detail route
     */
    getHandler: function (request, reply) {
        let sessionID = userHandler.getSessionID(request);
        var fileUuid = request.query.uuid;
        let errorId = request.query.id || -1;

        if (sessionID !== null && fileUuid !== null && errorId !== null) {
            winston.info(`Loading correction details. Session: ${sessionID}, File: ${fileUuid}, ErrorId: ${errorId}`);
            const fileDataKey = redisKeys.ERROR_PAGE_METADATA.compositeKey([sessionID, fileUuid]);

            cacheHandler.getJsonValue(fileDataKey).then(function(fileData) {
                winston.info(`Getting error details. Session: ${sessionID}, File: ${fileUuid}, ErrorId: ${errorId}`);
                //get the first error and extract basic error details
                let currentLineError = null;
                for (let lineError of fileData.correctionsData.lineErrors) {
                    if (lineError.errorCode.toString() === errorId.toString()) {
                        currentLineError = lineError;
                        break;
                    }
                }

                var errorSummaryData = {
                    filename: fileData.name,
                    Correction: false,
                    CorrectionDetails: true,
                    CorrectionMoreHelp: true,
                    fieldName: currentLineError.fieldName,
                    errorCode: currentLineError.errorCode,
                    MoreHelpLink: currentLineError.helpReference
                };
                var errorSummary = errorHandler.render(currentLineError.errorCode, errorSummaryData, currentLineError.errorMessage);

                reply.view('data-returns/correction-detail', merge.recursive(fileData, {
                    uuid: fileUuid,
                    errorSummary: errorSummary,
                    errorDetail: currentLineError
                }));
            }).catch(function (err) {
                winston.error(err);
            });
        } else {
            reply.redirect('/file/choose');
        }
    }
};