'use strict';
const winston = require('winston');
const lodash = require('lodash');
const cacheHandler = require('../../lib/cache-handler');
const userHandler = require('../../lib/user-handler');
const errorHandler = require('../../lib/error-handler');
const redisKeys = require('../../lib/redis-keys');

module.exports = {
    /*
     * HTTP GET Handler for /correction/detail route
     */
    getHandler: function (request, reply) {
        const sessionID = userHandler.getSessionID(request);
        const fileUuid = request.query.uuid;
        const errorId = request.query.id || -1;

        if (sessionID !== null && fileUuid !== null && errorId !== null) {
            winston.info(`Loading correction details. Session: ${sessionID}, File: ${fileUuid}, ErrorId: ${errorId}`);
            redisKeys.ERROR_PAGE_METADATA.compositeKey([sessionID, fileUuid])
                .then(cacheHandler.getJsonValue)
                .then((fileData) => {
                    if (fileData === null) {
                        winston.warn(`Unable to retrieve valid file data for session: ${sessionID}, file: ${fileUuid}, redirecting to chooser`);
                        return reply.redirect('/file/choose');
                    }
                    winston.info(`Getting error details. Session: ${sessionID}, File: ${fileUuid}, ErrorId: ${errorId}`);

                    const lineErrorsForErrorCode = fileData.correctionsData.lineErrors.filter(value => value.errorCode.toString() === errorId.toString());
                    if (lineErrorsForErrorCode.length !== 1) {
                        winston.error(new Error(`Found ${lineErrorsForErrorCode.length} errors for a single error code, should be exactly 1`));
                        return reply.redirect('/failure');
                    }

                    // Set up metadata to display the corrections detail for the appropriate error code
                    const errorDetail = lineErrorsForErrorCode[0];
                    const errorSummaryData = {
                        uuid: fileUuid,
                        filename: fileData.name,
                        fieldName: errorDetail.fieldName,
                        fieldHeadingText: errorDetail.fieldHeadingText,
                        errorCode: errorDetail.errorCode
                    };

                    // Render the error summary displayed at the top of the correction details page
                    const summaries = [];
                    for (const type of errorDetail.errorTypes) {
                        const summary = {
                            errorType: type,
                            link: '#' + type.key,
                            guidance: errorHandler.renderCorrectionMessage(errorDetail.errorCode, type.name, errorSummaryData, type.message)
                        };
                        summaries.push(summary);
                    }
                    // Render more help for use in the correction details
                    const moreHelp = errorHandler.renderCorrectionMessage(errorDetail.errorCode, 'MoreHelp', errorSummaryData);

                    reply.view('data-returns/correction-detail', lodash.merge({}, fileData, errorSummaryData, {
                        summaries: summaries,
                        errorDetail: errorDetail,
                        moreHelp: moreHelp
                    }));
                })
                .catch(function (err) {
                    winston.error(err);
                    return reply.redirect('/failure');
                });
        } else {
            reply.redirect('/file/choose');
        }
    }
};
