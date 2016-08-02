"use strict";
var csvValidator = require('../lib/csv-validator');
var path = require('path');
var fs = require('fs');
var uuidGen = require('node-uuid');
var config = require('../config/configuration_' + (process.env.NODE_ENV || 'local'));
var fileUploadHandler = require('../api-handlers/file-upload-handler');
var cacheHandler = require('../lib/cache-handler');
var helpLinks = require('../config/dep-help-links');
var userHandler = require('../lib/user-handler');
var errorHandler = require('../lib/error-handler');
var errorDescs = require('../lib/error-descriptions');
var utils = require('../lib/utils');
var metricsHandler = require('../lib/MetricsHandler');
var errBit = require('../lib/errbitErrorMessage');
var redisKeys = require('../lib/redis-keys');

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
    return {
        // ID comes from the fine-uploader JS lib qquid parameter or for legacy file uploads it is generated here.
        "id": request.payload.qquuid || uuidGen.v4(),
        "clientFilename": fileUpload.filename,
        "localFilename": fileUpload.path,
        "sessionID": request.state['data-returns-id'] ? utils.base64Decode(request.state['data-returns-id']) : userHandler.getNewUserID()
    };
}

function handleUploadedFile(reqInfo) {
    return new Promise(function (resolve, reject) {
        var newLocalPath = reqInfo.localFilename.concat(path.extname(reqInfo.clientFilename));
        var fileSize = fs.statSync(reqInfo.localFilename).size;
        metricsHandler.setFileSizeHighWaterMark(fileSize);
        console.log('==> ChooseFileHandler: Processing new uploaded file: ' + reqInfo.clientFilename);
        utils.renameFile(reqInfo.localFilename, newLocalPath)
            .then(csvValidator.validateFile)
            .then(function () {
                return fileUploadHandler.uploadFileToService(newLocalPath, reqInfo.sessionID, reqInfo.id, reqInfo.clientFilename);
            })
            .then(function (fileStatus) {
                console.log("Adding " + fileStatus.originalFileName);
                var fileData = {
                    "id": reqInfo.id,
                    "sid": fileStatus.uploadResult.fileKey,
                    "name": fileStatus.originalFileName,
                    "status": {
                        "state": "ready",
                        "description": "Ready to send",
                        "server": fileStatus
                    }
                };
                cacheHandler.arrayRPush(redisKeys.UPLOADED_FILES.compositeKey(reqInfo.sessionID), fileData);
                resolve({"success": true, "details": fileData});
            })
            .catch(function (errorData) {
                if (errorData === null || !('isUserError' in errorData) || !errorData.isUserError) {
                    console.log("Unexpected error for  " + reqInfo.clientFilename);
                    var msg = new errBit.errBitMessage(errorData, __filename, 'unexpectedErrorHandler', errorData.stack);
                    console.error(msg);
                    reject({
                        "success": false,
                        "preventRetry": false,
                        "errorType": "unexpected",
                        "message": msg,
                        "details": {
                            "id": reqInfo.id,
                            "name": reqInfo.clientFilename,
                            "status": {
                                "state": "error",
                                "errorCode": 3000,
                                "description": errorDescs.getDescription(3000)
                            }
                        }
                    });
                } else {
                    console.log("Validation errors found " + reqInfo.clientFilename);
                    // Handle expected errors...
                    var isLineErrors = errorData.lineErrorCount && errorData.lineErrorCount > 0;
                    var links = helpLinks.links;
                    var errorCode = errorData.errorCode;

                    if (!isLineErrors) {
                        links.errorCode = 'DR' + utils.pad(errorCode, 4);
                    }

                    links.mailto = config.feedback.mailto;

                    var metadata = {
                        uploadError: true,
                        errorSummary: isLineErrors ? errorData.errorSummary : errorHandler.render(errorCode, links, errorData.defaultErrorMessage),
                        fileName: reqInfo.clientFilename,
                        lineErrors: errorData.lineErrors,
                        isLineErrors: errorData.lineErrors ? true : false,
                        HowToFormatEnvironmentAgencyData: helpLinks.links.HowToFormatEnvironmentAgencyData,
                        errorCode: 'DR' + utils.pad(errorCode, 4),
                        mailto: config.feedback.mailto
                    };

                    var fileData = {
                        "id": reqInfo.id,
                        "sid": null,
                        "name": reqInfo.clientFilename,
                        "status": {
                            "state": "error",
                            "errorCode": errorData.errorCode,
                            "moreDetailsUrl": "data-returns/failure?uuid=" + reqInfo.id,
                            "description": errorDescs.getDescription(errorData.errorCode)
                        },
                        "correctionsData": metadata
                    };

                    var errorType;
                    if (isLineErrors) {
                        errorType = "content";
                        fileData.status.moreDetailsUrl = "/correction/table?uuid=" + reqInfo.id;
                    } else {
                        errorType = "file";
                        fileData.status.moreDetailsUrl = "/file/invalid?uuid=" + reqInfo.id;
                    }

                    cacheHandler.setValue(redisKeys.ERROR_PAGE_METADATA.compositeKey([reqInfo.sessionID, reqInfo.id]), fileData).then(function () {
                        console.log("Pushing status for " + reqInfo.clientFilename);

                        cacheHandler.arrayRPush(redisKeys.UPLOADED_FILES.compositeKey(reqInfo.sessionID), fileData);
                        resolve({
                            "success": false,
                            "preventRetry": true,
                            "errorType": errorType,
                            "metadata": metadata,
                            "details": fileData
                        });
                    });
                }
            });
    });
}

function buildStatusJson(sessionID) {
    return new Promise(function (resolve, reject) {
        var key = redisKeys.UPLOADED_FILES.compositeKey(sessionID);
        cacheHandler.arrayGet(key).then(function (uploads) {
            var hasInvalidUploads = uploads.filter(u => u.status.state !== "ready").length > 0;
            var status = {
                "canContinue": uploads.length > 0 && !hasInvalidUploads,
                "hasInvalidUploads": hasInvalidUploads,
                "files": uploads
            };
            resolve(status);
        }).catch(reject);
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
    let sessionID = utils.base64Decode(request.state['data-returns-id']);
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
    let sessionID = utils.base64Decode(request.state['data-returns-id']);

    if (request.payload.action === "remove") {
        removeUpload(sessionID, request.payload.uuid).then(function() {
            reply.redirect('/file/choose').rewritable(true);
        }).catch(function() {
            reply.redirect('data-returns/failure');
        });
    } else if (request.query.fineuploader === 'true') {
        fineUploaderHandler(request, reply);
    } else {
        legacyFileUploadHandler(request, reply);
    }
};