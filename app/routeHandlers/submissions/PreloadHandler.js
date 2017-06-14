"use strict";
const winston = require("winston");
const Boom = require('boom');
const lodash = require("lodash");
let userHandler = require('../../lib/user-handler');
let uuidGen = require('uuid');
let cacheHandler = require('../../lib/cache-handler');
let redisKeys = require('../../lib/redis-keys');
let fileUploadProcessor = require("../../lib/file-upload-processor");


function createSession() {
    return new Promise(function (resolve, reject) {
        let publicInfo = {
            "sessionId": uuidGen.v4(),
            "sessionKey": uuidGen.v4()
        };

        let backendData = lodash.merge({"internalKey": uuidGen.v4()}, publicInfo);
        redisKeys.PRELOADED_SESSIONS.compositeKey(publicInfo.sessionId)
            .then((redisKey) => cacheHandler.setValue(redisKey, backendData))
            .then(() => resolve(publicInfo))
            .catch(reject);
    });
}

function clearSession(sessionId) {
    // Clear session after a delay to avoid de-sync issues if a HEAD request occurs after a GET request
    setTimeout(function () {
        redisKeys.PRELOADED_SESSIONS.compositeKey(sessionId)
            .then(cacheHandler.delete)
            .then(() => winston.info(`Deleted preloaded session data for id ${sessionId}`))
            .catch(err => winston.error(`Failed to delete preloaded session data from redis for id ${sessionId}`, err));
    }, 15 * 1000);
}
/*
 *  HTTP GET handler for /file/preload
 *  @Param request
 *  @Param reply
 */
module.exports.getHandler = function (request, reply) {
    let reqInfo = {
        "sessionId": request.query.sessionId,
        "sessionKey": request.query.sessionKey
    };

    winston.info(`Attempting to retrieve session for sessionId=${reqInfo.sessionId} sessionKey=${reqInfo.sessionKey}`);
    redisKeys.PRELOADED_SESSIONS.compositeKey(reqInfo.sessionId)
        .then(cacheHandler.getJsonValue)
        .then((sessionData) => {
            if (!sessionData || reqInfo.sessionKey !== sessionData.sessionKey) {
                let reason = !sessionData ? 'No session data' : `Session key mismatch.  Requested: ${reqInfo.sessionKey}, Found: ${sessionData.sessionKey}`;
                winston.warn(`Preload Handler: Denied access to preload session (unauthorised).  Requested session id ${reqInfo.sessionId}.  Reason ${reason}`);
                return reply(Boom.unauthorized('Not permitted'));
            }

            if (request.method === 'head') {
                reply.redirect('/file/choose');
            } else {
                return userHandler.newUserSession(request, reply, sessionData.internalKey)
                    .then(() => reply.redirect('/file/choose'))
                    .then(() => clearSession(reqInfo.sessionId))
                    .catch(winston.error);
            }
        })
        .catch(function (err) {
            winston.error("Failed to retrieve upload session data", err);
            return reply(Boom.internal("Unable to retrieve preloaded session data.", err, 500));
        });
};

/*
 *  HTTP POST handler for /file/preload
 *  @Param request
 *  @Param reply
 */
module.exports.postHandler = function (request, reply) {
    if (request.query.createSession) {
        winston.info("Preload Handler: Creating a new preload session.");
        createSession().then((sessionData) => reply(sessionData).type('application/json'));
    } else {
        winston.info("Preload Handler: Receiving a new file.");
        let reqInfo = {
            "sessionId": request.query.sessionId || null,
            "sessionKey": request.query.sessionKey || null
        };

        redisKeys.PRELOADED_SESSIONS.compositeKey(reqInfo.sessionId)
            .then(cacheHandler.getJsonValue)
            .then((sessionData) => {
                if (!sessionData || reqInfo.sessionKey !== sessionData.sessionKey) {
                    let reason = !sessionData ? 'No session data' : `Session key mismatch.  Requested: ${reqInfo.sessionKey}, Found: ${sessionData.sessionKey}`;
                    winston.error(`Preload Handler: Denied access to preload session (unauthorised).  Requested session id ${reqInfo.sessionId}.  Reason ${reason}`);
                    return reply(Boom.unauthorized('Not permitted'));
                }

                // Build a data structure to represent the uploaded files.
                let fileData = fileUploadProcessor.getFileData(request, sessionData.internalKey);

                winston.info("Preload Handler: Processing uploaded files.");
                let callbacks = 0;
                let result = lodash.merge({}, reqInfo, {
                    "files": new Array()
                });
                let resultHandler = function (processorResult) {
                    result.files.push(processorResult.details.name);
                    if (++callbacks === fileData.files.length) {
                        winston.info("Preload Handler: File(s) completed processing.");
                        reply(result).type('application/json');
                    }
                };
                fileData.files.forEach(function (upload) {
                    winston.info(`Preload Handler: Processing file ${upload.clientFilename}`);
                    fileUploadProcessor.processUploadedFile(upload).then(resultHandler).catch(resultHandler);
                });
            })
            .catch(function (err) {
                winston.error("Unable to upload file to preload session.", err);
                return reply(Boom.internal("Unable to retrieve upload file to preload session.", err, 500));
            });
    }
};