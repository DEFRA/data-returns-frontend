"use strict";
var fs = require('fs');
var request = require('request');
var config = require('../config/configuration_' + (process.env.NODE_ENV || 'local'));
var utils = require('../lib/utils');
var validationErrorHelper = require('./multiple-error-helper');
var errorHandler = require('../lib/error-handler');
const errbit = require("../lib/errbit-handler");
var crypto = require('../lib/crypto-handler');

/**
 * Uploads a file to the Data Exchange service.
 * @param filePath Full path to the file to upload.
 * @param sessionID the users sessionID
 * @param originalFileName the original client side file name uploaded by the user.
 * @returns {Promise} A promise that is fulfilled when the upload completes
 *   successfully, or is rejected if an error occurs.  If successful, the
 *   promise is resolved with an object containing the fields 'fileKey',
 *   'eaId', 'siteName' and 'returnType' as returned from the API.
 */
module.exports.uploadFileToService = function (filePath, sessionID, fileUuid, originalFileName) {
    console.log('==> uploadFileToService() url: ' + config.API.endpoints.FILEUPLOAD);
    return new Promise(function (resolve, reject) {
        // Define data to send to the Data Exchange service.
        var apiData = {
            url: config.API.endpoints.FILEUPLOAD,
            gzip: true,
            timeout: 60000, //ms 60 seconds
            headers: {
                'Authorization': crypto.calculateAuthorizationHeader(filePath),
                'filename': filePath
            },
            formData: {
                fileUpload: {
                    value: fs.createReadStream(filePath),
                    options: {
                        filename: originalFileName
                    }
                }
            }
        };

        // Make REST call into the Data Exchange service, and handle the result.
        request.post(apiData, function (err, httpResponse, body) {
            var statusCode = (!err && httpResponse && httpResponse.statusCode) ? httpResponse.statusCode : 3000;
            var errorSummary, apiErrors = '';

            console.log("Received upload response for " + originalFileName);
            if (err) {
                errbit.notify(err);
                reject({
                    isUserError: true,
                    message: errorHandler.render(3000, {mailto: config.feedback.mailto}),
                    errorSummary: errorHandler.render(3000, {mailto: config.feedback.mailto}),
                    errorCode: 3000
                });
            } else if (statusCode === 200) {
                //File sent, received and processed successfully
                if (body) {
                    httpResponse = JSON.parse(body);
                    if (httpResponse) {
                        httpResponse.originalFileName = originalFileName;
                        resolve(httpResponse);
                    }
                } else {
                    reject({
                        isUserError: true,
                        message: errorHandler.render(3000, {mailto: config.feedback.mailto}),
                        errorSummary: errorHandler.render(3000, {mailto: config.feedback.mailto}),
                        errorCode: 3000
                    });
                }

            } else {
                //There are validation errors

                try {
                    if (body) {
                        httpResponse = JSON.parse(body);
                    }
                } catch (e) {
                    errbit.notify(e);

                    return reject({
                        isUserError: true,
                        errorCode: 3000,
                        message: errorHandler.render(3000, {mailto: config.feedback.mailto}, 'System error'),
                        errorSummary: errorHandler.render(3000, {mailto: config.feedback.mailto}, 'System error'),
                        lineErrors: null,
                        lineErrorCount: 0,
                        defaultErrorMessage: 'System error'
                    });
                }

                var appStatusCode = (httpResponse && httpResponse.appStatusCode) ? httpResponse.appStatusCode : 3000;
                var lineErrorData;
                var lineErrors;
                var temp;
                var lineError;
                var sortedLineErrorData;
                var lineErrorName;

                switch (appStatusCode) {
                    case 900://Line errors

                        errorSummary = errorHandler.render(900, {filename: originalFileName});
                        apiErrors = httpResponse.validationErrors;
                        lineErrorData = [];
                        lineErrors = apiErrors; //apiErrors.lineErrors;
                        temp;
                        lineError;

                        for (lineErrorName in lineErrors) {
                            lineError = {};
                            temp = lineErrors[lineErrorName];
                            lineError.lineNumber = parseInt(temp.lineNumber, 10);
                            lineError.fieldName = temp.fieldName;
                            lineError.errorValue = temp.errorValue;
                            lineError.errorMessage = errorHandler.render(temp.errorCode,
                                {
                                    filename: originalFileName,
                                    Correction: true,
                                    CorrectionDetails: false,
                                    CorrectionMoreHelp: false
                                }, temp.errorMessage);
                            lineError.errorCode = 'DR' + utils.pad(temp.errorCode, 4);
                            lineError.errorType = temp.errorType;
                            lineError.moreHelp = errorHandler.render(temp.errorCode,
                                {
                                    filename: originalFileName,
                                    Correction: false,
                                    CorrectionDetails: false,
                                    CorrectionMoreHelp: true,
                                    MoreHelpLink: temp.helpReference
                                }, temp.errorMessage);
                            lineError.helpReference = temp.helpReference;
                            lineError.definition = temp.definition ? temp.definition : temp.fieldName;
                            lineError.Correction = true;
                            lineError.CorrectionDetails = true;
                            lineError.CorrectionMoreHelp = true;
                            lineErrorData.push(lineError);
                        }

                        sortedLineErrorData = lineErrorData.sort(utils.sortByProperty('fieldName'));
                        sortedLineErrorData = validationErrorHelper.groupErrorData(sessionID, fileUuid, sortedLineErrorData);

                        reject({
                            isUserError: true,
                            errorCode: appStatusCode,
                            errorSummary: errorSummary,
                            lineErrors: sortedLineErrorData,
                            lineErrorCount: sortedLineErrorData.length
                        });

                        break;
                    default:
                        //other errors
                        var defaultErrorMessage = httpResponse.message;

                        reject({
                            isUserError: true,
                            errorCode: appStatusCode,
                            message: errorHandler.render(appStatusCode, {mailto: config.feedback.mailto}, defaultErrorMessage),
                            errorSummary: errorHandler.render(appStatusCode, {mailto: config.feedback.mailto}, defaultErrorMessage),
                            lineErrors: sortedLineErrorData,
                            lineErrorCount: (apiErrors && apiErrors.errorCount) ? apiErrors.errorCount : 0,
                            defaultErrorMessage: defaultErrorMessage
                        });
                        break;
                }
            }
        });
    });
};
