'use strict';
const winston = require('winston');
const userHandler = require('../../lib/user-handler');
const fileUploadProcessor = require('../../lib/file-upload-processor');

function buildStatusJson (sessionID) {
    return new Promise(function (resolve, reject) {
        userHandler.getUploads(sessionID).then(function (uploads) {
            const hasInvalidUploads = uploads.filter(u => u.status.state !== 'ready').length > 0;
            // Sort by filename
            uploads.sort((a, b) => {
                return a.name.toUpperCase().localeCompare(b.name.toUpperCase());
            });
            const status = {
                'canContinue': uploads.length > 0 && !hasInvalidUploads,
                'hasInvalidUploads': hasInvalidUploads,
                'files': uploads
            };
            resolve(status);
        }).catch(reject);
    });
}

function removeUpload (sessionID, uuid) {
    return new Promise(function (resolve, reject) {
        userHandler.getUploads(sessionID).then(function (uploads) {
            for (const upload of uploads) {
                if (upload.id === uuid) return upload;
            }
            return null;
        }).then(function (uploadToRemove) {
            if (uploadToRemove !== null) {
                return userHandler.removeUpload(sessionID, uploadToRemove);
            }
        }).then(resolve).catch(reject);
    });
}

/*
 *  HTTP GET handler for /file/choose
 *  @Param request
 *  @Param reply
 */
module.exports.getHandler = function (request, reply) {
    const sessionID = userHandler.getSessionID(request);
    const loadPageCallback = function (status) {
        reply.view('data-returns/choose-your-file', status);
    };

    const statusJsonCallback = function (status) {
        reply(status).type('application/json');
    };
    const returnJson = request.query.status === 'true';
    const handler = returnJson ? statusJsonCallback : loadPageCallback;
    buildStatusJson(sessionID)
        .then(handler)
        .catch((e) => {
            winston.error(e);
            if (returnJson) {
                return statusJsonCallback({
                    'canContinue': false,
                    'files': []
                });
            } else {
                reply.redirect('/failure');
            }
        });
};

/*
 *  HTTP POST handler for /file/choose
 *  @Param request
 *  @Param reply
 */
module.exports.postHandler = function (request, reply) {
    const sessionID = userHandler.getSessionID(request);
    const usingFineUploader = request.query.fineuploader === 'true';

    // Request payload present - handle normal upload request
    if (request.payload && request.payload.action === 'remove') {
        removeUpload(sessionID, request.payload.uuid).then(function () {
            reply.redirect('/file/choose').rewritable(true);
        }).catch(function () {
            reply.redirect('/failure');
        });
    } else {
        const sessionID = userHandler.getSessionID(request);
        const fileData = fileUploadProcessor.getFileData(request, sessionID);

        const legacyUploaderOnComplete = function () {
            reply.redirect('/file/choose').rewritable(true);
        };
        const fineUploaderOnComplete = function (processorResponse) {
            reply(processorResponse).type('text/plain').code(processorResponse.httpCode || 200);
        };

        let callbacks = 0;
        const resultHandler = function (processorResponse) {
            if (++callbacks === fileData.files.length) {
                usingFineUploader ? fineUploaderOnComplete(processorResponse) : legacyUploaderOnComplete(processorResponse);
            }
        };

        fileData.files.forEach(function (upload) {
            winston.info(`ChooseFileHandler: Processing file ${upload.clientFilename}`);
            fileUploadProcessor.processUploadedFile(upload).then(resultHandler).catch(resultHandler);
        });
    }
};
