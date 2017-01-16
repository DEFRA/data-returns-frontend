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
        cacheHandler.setValue(redisKeys.PRELOADED_SESSIONS.compositeKey(publicInfo.sessionId), backendData).then(function () {
            resolve(publicInfo);
        }).catch(reject);
    });
}


/*
 *  HTTP GET handler for /file/preload
 *  @Param request
 *  @Param reply
 */
module.exports.getHandler = function (request, reply) {
    if (request.method === 'head') {
        reply.redirect('/file/choose');
    } else {
        let reqInfo = {
            "sessionId": request.query.sessionId,
            "sessionKey": request.query.sessionKey
        };

        winston.info(`Attempting to retrieve session for sessionId=${reqInfo.sessionId} sessionKey=${reqInfo.sessionKey}`);

        let preloadSessionKey = redisKeys.PRELOADED_SESSIONS.compositeKey(reqInfo.sessionId);

        cacheHandler.getJsonValue(preloadSessionKey).then(function (sessionData) {
            if (!sessionData || reqInfo.sessionKey !== sessionData.sessionKey) {
                winston.info("Preload Handler: Denied access to preload session (unauthorised)");
                return reply(Boom.unauthorized('Not permitted'));
            }

            return cacheHandler.delete(preloadSessionKey).then(function () {
                userHandler.newUserSession(request, reply, sessionData.internalKey)
                    .then(() => reply.redirect('/file/choose'))
                    .catch(winston.error);
            });

        }).catch(function (err) {
            winston.error(err);
            return reply(Boom.internal("Unable to retrieve preloaded session data.", err, 500));
        });
    }
};

/*
 *  HTTP POST handler for /file/preload
 *  @Param request
 *  @Param reply
 */
module.exports.postHandler = function (request, reply) {
    if (request.query.createSession) {
        winston.info("Preload Handler: Creating a new preload session.");
        createSession().then(function (sessionData) {
            return reply(sessionData).type('application/json');
        });
    } else {
        winston.info("Preload Handler: Receiving a new file.");
        let reqInfo = {
            "sessionId": request.query.sessionId || null,
            "sessionKey": request.query.sessionKey || null
        };

        cacheHandler.getJsonValue(redisKeys.PRELOADED_SESSIONS.compositeKey(reqInfo.sessionId)).then(function (sessionData) {
            if (!sessionData || reqInfo.sessionKey !== sessionData.sessionKey) {
                winston.info("Preload Handler: Denied access to preload session (unauthorised)");
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
        });
    }
};