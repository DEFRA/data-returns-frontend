"use strict";
const winston = require("winston");
var fs = require('fs');
var request = require('request');
var config = require('../config/configuration_' + (process.env.NODE_ENV || 'local'));
var validationErrorHelper = require('./multiple-error-helper');
var errorHandler = require('../lib/error-handler');
var crypto = require('../lib/crypto-handler');
const moreHelp = require('../config/field-help-links');

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
    winston.info('==> uploadFileToService() url: ' + config.API.endpoints.FILEUPLOAD);
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

            winston.info("Received upload response for " + originalFileName);
            if (err) {
                winston.error(err);
                reject({
                    isUserError: true,
                    errorCode: 3000
                });
            } else if (statusCode === 200) {
                //File sent, received and processed successfully
                if (body) {
                    let bodyData = JSON.parse(body);
                    if (bodyData) {
                        bodyData.originalFileName = originalFileName;
                        resolve(bodyData);
                    }
                } else {
                    reject({
                        isUserError: true,
                        errorCode: 3000
                    });
                }

            } else {
                //There are validation errors
                let bodyData = {};
                try {
                    bodyData = JSON.parse(body);
                } catch (e) {
                    let responseText = `Failed to parse JSON response from backend (${e.message})`;
                    responseText += `\n\rBody:\n\r${body}`;
                    responseText += `\n\rHTTP response:\n\r${JSON.stringify(httpResponse)}`;
                    winston.error(new Error(responseText));

                    return reject({
                        isUserError: true,
                        errorCode: 3000
                    });
                }

                let appStatusCode = (bodyData && bodyData.appStatusCode) ? bodyData.appStatusCode : 3000;
                switch (appStatusCode) {
                    case 900: {
                        //Line errors
                        let lineErrorData = new Array();

                        for (let lineError of bodyData.validationErrors) {
                            lineError.errorMessage = errorHandler.render(lineError.errorCode,
                                {
                                    filename: originalFileName,
                                    Correction: true,
                                    CorrectionDetails: false,
                                    CorrectionMoreHelp: false
                                }, lineError.errorMessage);
                            lineError.moreHelp = errorHandler.render(lineError.errorCode,
                                {
                                    filename: originalFileName,
                                    Correction: false,
                                    CorrectionDetails: false,
                                    CorrectionMoreHelp: true,
                                    MoreHelpLink: moreHelp.fields[lineError.fieldName]
                                }, lineError.errorMessage);
                            lineErrorData.push(lineError);
                        }
                        let groupedLineErrorData = validationErrorHelper.groupErrorData(lineErrorData);

                        reject({
                            isUserError: true,
                            errorCode: appStatusCode,
                            lineErrors: groupedLineErrorData
                        });

                        break;
                    }
                    default: {
                        reject({
                            isUserError: true,
                            errorCode: appStatusCode,
                            defaultErrorMessage: bodyData.message
                        });
                        break;
                    }
                }
            }
        });
    });
};