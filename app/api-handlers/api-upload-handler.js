'use strict';
const winston = require('winston');
const config = require('../lib/configuration-handler.js').Configuration;

const fs = require('fs');
const request = require('request');
const validationErrorHelper = require('./multiple-error-helper');
const crypto = require('../lib/crypto-handler');

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
    const endPoint = config.get('api.base') + '/' + config.get('api.endpoints.fileUpload');

    winston.info('==> uploadFileToService() url: ' + endPoint);
    return new Promise(function (resolve, reject) {
        // Define data to send to the Data Exchange service.
        const apiData = {
            url: endPoint,
            gzip: true,
            timeout: 60000, // ms 60 seconds
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
            const statusCode = (!err && httpResponse && httpResponse.statusCode) ? httpResponse.statusCode : 3000;

            winston.info('Received upload response for ' + originalFileName);
            if (err) {
                winston.error('Error communicating with data-exchange API', err);
                reject({
                    isUserError: true,
                    errorCode: 3000
                });
            } else if (statusCode === 200) {
                // File sent, received and processed successfully
                if (body) {
                    const bodyData = JSON.parse(body);
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
                // There are validation errors
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

                const appStatusCode = (bodyData && bodyData.appStatusCode) ? bodyData.appStatusCode : 3000;
                switch (appStatusCode) {
                    case 900: {
                        // Line errors
                        const groupedLineErrorData = validationErrorHelper.groupErrorData(bodyData.validationErrors);

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
