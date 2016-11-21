"use strict";
const winston = require("winston");
var csvValidator = require('../../lib/csv-validator');
var fs = require('fs');
const lodash = require("lodash");
var uuidGen = require('node-uuid');
var fileUploadHandler = require('../../api-handlers/file-upload-handler');
var cacheHandler = require('../../lib/cache-handler');
var userHandler = require('../../lib/user-handler');
var errorDescs = require('../../lib/error-descriptions');
var metricsHandler = require('../../lib/MetricsHandler');
var redisKeys = require('../../lib/redis-keys');

/**
 * Handler for traditional form based file uploads.  This method is only used if JavaScript is disabled in the client's browser and
 * will redirect the reply to the appropriate content as necessary
 */
function legacyFileUploadHandler(request, reply) {
    // Get an array of uploads (handle single upload case)
    let uploads = Array.isArray(request.payload.fileUpload) ? request.payload.fileUpload : [request.payload.fileUpload];
    let callbacks = 0;
    var resultHandler = function () {
        if (++callbacks === uploads.length) {
            reply.redirect('/file/choose').rewritable(true);
        }
    };
    uploads.forEach(function (upload) {
        handleUploadedFile(extractUploadDetails(request, upload)).then(resultHandler).catch(resultHandler);
    });
}

/**
 * Handler for fineuploader JS uploads.  Returns a JSON response to the client API
 */
function fineUploaderHandler(request, reply) {
    var resultHandler = function (result) {
        reply(result).type('text/plain');
    };
    handleUploadedFile(extractUploadDetails(request, request.payload.fileUpload)).then(resultHandler).catch(resultHandler);
}

function extractUploadDetails(request, fileUpload) {
    let details = {
        // ID comes from the fine-uploader JS lib qquid parameter or for legacy file uploads it is generated here.
        "id": getUploadFileUuid(request),
        "clientFilename": getClientFilename(request, fileUpload),
        "localFilename": fileUpload ? fileUpload.path : null,
        "sessionID": userHandler.getSessionID(request)
    };
    return details;
}

function isFineUploaderRequest(request) {
    return request.query.fineuploader === 'true';
}

function getUploadFileUuid(request) {
    // UUID's are generated server-side for the legacy file uploader or supplied in the qquuid param for fineuploader
    return isFineUploaderRequest(request) ? request.query.qquuid : uuidGen.v4();
}

function getClientFilename(request, fileUpload) {
    let filename = "Unknown";
    if (isFineUploaderRequest(request)) {
        // Retrieved via query parameter for fineuploader
        filename = request.query.qqfilename;
    } else if (fileUpload && fileUpload.filename) {
        // Retrieve through the request.payload.fileUpload path (form uploader)
        filename = fileUpload.filename;
    }
    return filename;
}

function createFileDetailsJson(uuid, clientFilename, errorCode) {
    let details = {
        "id": uuid,
        "name": clientFilename,
        "status": {
            "state": "ready",
            "description": "Ready to send",
            "explanation": "Your file has been checked and is ready to send"
        }
    };

    if (errorCode) {
        // More details url
        let urlPrefix = errorCode === 900 ?  "/correction/table?uuid=" : "/file/invalid?uuid=";
        let moreDetailsUrl = `${urlPrefix}${uuid}`;
        details.status = lodash.merge({
            "state": "error",
            "errorCode": errorCode,
            "moreDetailsUrl": moreDetailsUrl,
            "moreDetailsTitle": errorCode === 900 ? "Show corrections" : "More details"
        }, errorDescs.getDefinition(errorCode));
    }
    return details;
}

/**
 * Handle uploads from the fineuploader JS client library.  Each file is uploaded individually to the service and the
 * service responds with a JSON document which is processed by the client library.
 *
 * @param fileData JSON structure describing the request - see extractUploadDetails
 * @returns {Promise}
 */
function handleUploadedFile(fileData) {
    return new Promise(function (resolve, reject) {
        var fileSize = fs.statSync(fileData.localFilename).size;
        metricsHandler.setFileSizeHighWaterMark(fileSize);
        winston.info('ChooseFileHandler: Processing new uploaded file: ' + fileData.clientFilename);
        csvValidator.validateFile(fileData.localFilename, fileSize).then(function () {
            return fileUploadHandler.uploadFileToService(fileData.localFilename, fileData.sessionID, fileData.id, fileData.clientFilename);
        }).then(function (backendResult) {
            let processingResult = createFileDetailsJson(fileData.id, fileData.clientFilename);
            processingResult.sid = backendResult.uploadResult.fileKey;
            processingResult.status.server = backendResult;
            return cacheHandler.arrayRPush(redisKeys.UPLOADED_FILES.compositeKey(fileData.sessionID), processingResult);
        }).then(function (fileData) {
            resolve({"success": true, "details": fileData});
        }).catch(function (errorData) {
            if (lodash.isError(errorData)) {
                winston.error(errorData);
                return reject({
                    "success": false,
                    "preventRetry": false,
                    "details": createFileDetailsJson(fileData.id, fileData.clientFilename, 3000)
                });
            }

            winston.info("ChooseFileHandler: Validation errors found in " + fileData.clientFilename);
            // Handle expected errors...
            let errorCode = errorData.errorCode;
            let processingResult = createFileDetailsJson(fileData.id, fileData.clientFilename, errorCode);
            processingResult.correctionsData = errorData;

            cacheHandler.setValue(redisKeys.ERROR_PAGE_METADATA.compositeKey([fileData.sessionID, fileData.id]), processingResult).then(function () {
                cacheHandler.arrayRPush(redisKeys.UPLOADED_FILES.compositeKey(fileData.sessionID), processingResult);
                resolve({
                    "success": false,
                    "preventRetry": true,
                    "details": processingResult
                });
            });
        }).then(function () {
            // Finally delete the uploaded file - we can delete it here because any valid file will be stored on the
            // backend API and we don't care about invalid files
            fs.unlink(fileData.localFilename, function (err) {
                if (err !== null) {
                    winston.error(`Unable to delete uploaded file ${fileData.localFilename}`, err);
                }
            });
        });
    });
}

function buildStatusJson(sessionID) {
    return new Promise(function (resolve, reject) {
        var key = redisKeys.UPLOADED_FILES.compositeKey(sessionID);
        cacheHandler.arrayGet(key).then(function (uploads) {
            var hasInvalidUploads = uploads.filter(u => u.status.state !== "ready").length > 0;
            // Sort by filename
            uploads.sort((a, b) => {
                return a.name.toUpperCase().localeCompare(b.name.toUpperCase());
            });
            var status = {
                "canContinue": uploads.length > 0 && !hasInvalidUploads,
                "hasInvalidUploads": hasInvalidUploads,
                "files": uploads
            };
            resolve(status);
        }).catch(function(err) {
            reject(err);
        });
    });
}

function removeUpload(sessionID, uuid) {
    return new Promise(function (resolve, reject) {
        var key = redisKeys.UPLOADED_FILES.compositeKey(sessionID);
        cacheHandler.arrayGet(key).then(function (uploads) {
            for (let upload of uploads) {
                if (upload.id === uuid) return upload;
            }
            return null;
        }).then(function (uploadToRemove) {
            if (uploadToRemove !== null) {
                return cacheHandler.arrayRemove(key, uploadToRemove);
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
    var sessionID = userHandler.getSessionID(request);
    let loadPageCallback = function (status) {
        reply.view('data-returns/choose-your-file', status);
    };
    let statusJsonCallback = function (status) {
        reply(status).type('application/json');
    };
    let handler = request.query.status === "true" ? statusJsonCallback : loadPageCallback;
    buildStatusJson(sessionID).then(handler);
};


/*
 *  HTTP POST handler for /file/choose
 *  @Param request
 *  @Param reply
 */
module.exports.postHandler = function (request, reply) {
    let sessionID = userHandler.getSessionID(request);
    let usingFineUploader = request.query.fineuploader === 'true';

    if (!request.payload) {
        // No payload - something wrong with the request (either too large or malformed)
        let errorData = {
            "success": false,
            "preventRetry": true,
            "httpCode": 400
        };

        const fileSize = Math.max(request.query.qqtotalfilesize || 0, request.headers['content-length'] || 0);
        const maxBytes = request.route.settings.payload.maxBytes;
        let fileDetails = null;
        if (maxBytes !== undefined && fileSize && parseInt(fileSize, 10) > maxBytes) {
            errorData.httpCode = 413; // Request entity too large
            fileDetails = createFileDetailsJson(getUploadFileUuid(request), getClientFilename(request), 550);
        } else {
            // Don't know what went wrong - display standard error page
            fileDetails = createFileDetailsJson(getUploadFileUuid(request), getClientFilename(request), 3000);
        }
        // Set the file details on the JSON response
        errorData.details = fileDetails;

        cacheHandler.setValue(redisKeys.ERROR_PAGE_METADATA.compositeKey([sessionID, fileDetails.id]), fileDetails).then(function () {
            cacheHandler.arrayRPush(redisKeys.UPLOADED_FILES.compositeKey(sessionID), fileDetails);
        });

        // Create the appropriate response (html for legacy uploader, json for fineuploader)
        if (usingFineUploader) {
            return reply(errorData).code(errorData.httpCode);
        } else {
            return reply.redirect('/file/choose').rewritable(true);
        }
    } else {
        // Request payload present - handle normal upload request
        if (request.payload.action === "remove") {
            removeUpload(sessionID, request.payload.uuid).then(function () {
                reply.redirect('/file/choose').rewritable(true);
            }).catch(function () {
                reply.redirect('data-returns/failure');
            });
        } else if (usingFineUploader) {
            fineUploaderHandler(request, reply);
        } else {
            legacyFileUploadHandler(request, reply);
        }
    }
};