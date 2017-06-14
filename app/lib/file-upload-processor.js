"use strict";
const winston = require("winston");
const lodash = require("lodash");
const fs = require('fs');
const csvValidator = require('./csv-validator');
const apiHandler = require('../api-handlers/api-upload-handler');
let uuidGen = require('uuid');
const cacheHandler = require('./cache-handler');
const errorDescs = require('./error-descriptions');
const metricsHandler = require('./MetricsHandler');
const redisKeys = require('./redis-keys');

let persistFileWithErrors = function (sessionId, fileUuid, fileDetails) {
    return redisKeys.ERROR_PAGE_METADATA.compositeKey([sessionId, fileUuid])
        .then((redisKey) => cacheHandler.setValue(redisKey, fileDetails))
        .then(persistFile(sessionId, fileDetails));

};

let persistFile = function (sessionId, fileDetails) {
    return redisKeys.UPLOADED_FILES.compositeKey(sessionId)
        .then((redisKey) => cacheHandler.arrayRPush(redisKey, fileDetails));
};


/**
 * Handle uploads from the fineuploader JS client library.  Each file is uploaded individually to the service and the
 * service responds with a JSON document which is processed by the client library.
 *
 * @param fileData JSON structure describing the request - see extractUploadDetails
 * @returns {Promise}
 */
module.exports = {

    createFileDetailsJson: function (uuid, clientFilename, errorCode) {
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
            let urlPrefix = errorCode === 900 ? "/correction/table?uuid=" : "/file/invalid?uuid=";
            let moreDetailsUrl = `${urlPrefix}${uuid}`;
            details.status = lodash.merge({
                "state": "error",
                "errorCode": errorCode,
                "moreDetailsUrl": moreDetailsUrl,
                "moreDetailsTitle": errorCode === 900 ? "Show corrections" : "More details"
            }, errorDescs.getDefinition(errorCode));
        }
        return details;
    },

    getFileData: function (request, sessionID) {
        let response = {
            "success": true,
            files: []
        };
        if (!request.payload) {
            response.success = false;
            response.files.push(this.buildFileUploadDetails(request, null, sessionID));
        } else {
            let uploads = Array.isArray(request.payload.fileUpload) ? request.payload.fileUpload : [request.payload.fileUpload];
            for (let upload of uploads) {
                winston.info(`File Upload Processor: Extracting file information for ${upload.filename}`);
                response.files.push(this.buildFileUploadDetails(request, upload, sessionID));
            }
        }
        return response;
    },


    isFineUploaderRequest: function (request) {
        return request.query.fineuploader === 'true';
    },

    getFileUUid: function (request) {
        // UUID's are generated server-side for the legacy file uploader or supplied in the uuid param for fineuploader
        return request.query.uuid || uuidGen.v4();
    },

    getClientFilename: function (request, fileUpload) {
        let path = request.query.filename || ((fileUpload && fileUpload.filename) ? fileUpload.filename : "Unknown");
        path = path.replace(/\\/g, '/');
        let parts = path.split('/');
        return parts[parts.length - 1];
    },

    buildFileUploadDetails: function (request, upload, sessionID) {
        let self = this;
        let fileDetails = {
            "id": this.getFileUUid(request),
            "clientFilename": self.getClientFilename(request, upload),
            "localFilename": (upload && upload.path) ? upload.path : null,
            "sessionID": sessionID,
        };

        if (!request.payload) {
            const fileSize = Math.max(request.query.filesize || 0, request.headers['content-length'] || 0);
            const maxBytes = request.route.settings.payload.maxBytes;

            if (maxBytes !== undefined && fileSize && parseInt(fileSize, 10) > maxBytes) {
                // Request entity too large
                fileDetails.errorCode = 550;
                fileDetails.httpCode = 413;
            } else {
                // Malformed request - show the default service error page against this file.
                fileDetails.errorCode = 3000;
                fileDetails.httpCode = 400;
            }
        }
        return fileDetails;
    },


    processUploadedFile: function (fileData) {
        let self = this;

        return new Promise(function (resolve, reject) {
            if (fileData.localFilename === null || fileData.errorCode) {
                let fileDetails = self.createFileDetailsJson(fileData.id, fileData.clientFilename, fileData.errorCode);
                let response = {
                    "success": false,
                    "preventRetry": true,
                    "httpCode": fileData.httpCode,
                    "errorCode": fileData.errorCode,
                    "details": fileDetails
                };
                return persistFileWithErrors(fileData.sessionID, fileDetails.id, fileDetails).then(() => reject(response));
            }

            let fileSize = fs.statSync(fileData.localFilename).size;
            metricsHandler.setFileSizeHighWaterMark(fileSize);
            winston.info('File Upload Processor: Processing new uploaded file: ' + fileData.clientFilename);
            csvValidator.validateFile(fileData.localFilename, fileSize).then(function () {
                return apiHandler.uploadFileToService(fileData.localFilename, fileData.sessionID, fileData.id, fileData.clientFilename);
            }).then(function (backendResult) {
                let processingResult = self.createFileDetailsJson(fileData.id, fileData.clientFilename);
                processingResult.sid = backendResult.uploadResult.fileKey;
                processingResult.status.server = backendResult;
                return persistFile(fileData.sessionID, processingResult);
            }).then(function (fileData) {
                resolve({"success": true, "details": fileData});
            }).catch(function (errorData) {
                if (lodash.isError(errorData)) {
                    winston.error(errorData);

                    return reject({
                        "success": false,
                        "preventRetry": false,
                        "details": self.createFileDetailsJson(fileData.id, fileData.clientFilename, 3000)
                    });
                }

                winston.info("File Upload Processor: Validation errors found in " + fileData.clientFilename);
                // Handle expected errors...
                let errorCode = errorData.errorCode;
                let processingResult = self.createFileDetailsJson(fileData.id, fileData.clientFilename, errorCode);
                processingResult.correctionsData = errorData;

                persistFileWithErrors(fileData.sessionID, fileData.id, processingResult)
                    .then(() => {
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
};
