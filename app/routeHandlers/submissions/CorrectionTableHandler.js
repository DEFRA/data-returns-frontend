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
        let sessionID = userHandler.getSessionID(request);
        let fileUuid = request.query.uuid;
        winston.info(`Loading correction table. Session: ${sessionID}, File: ${fileUuid}`);
        if (fileUuid) {
            redisKeys.ERROR_PAGE_METADATA.compositeKey([sessionID, fileUuid])
                .then(cacheHandler.getJsonValue)
                .then((fileData) => {
                    if (fileData && fileData.name) {
                        for (let lineError of fileData.correctionsData.lineErrors) {
                            // Render correction message for each type of violation reported by the backend.
                            lineError.correction = "";
                            for (let type of lineError.errorTypes) {
                                lineError.correction += errorHandler.renderCorrectionMessage(lineError.errorCode, type.name, {}, type.message);
                            }
                            // Render more help for use in the correction table
                            lineError.correction += errorHandler.renderCorrectionMessage(lineError.errorCode, "MoreHelp", {});
                        }
                        let errorSummary = errorHandler.render(900, {filename: fileData.name});
                        let metadata = lodash.merge({errorSummary: errorSummary}, fileData);
                        reply.view('data-returns/correction-table', metadata);
                    } else {
                        reply.redirect('/file/choose');
                    }
                })
                .catch(() => reply.redirect('/file/choose'));
        } else {
            reply.redirect('/file/choose');
        }
    }
};