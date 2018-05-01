'use strict';
const winston = require('winston');
const config = require('../lib/configuration-handler.js').Configuration;

const fs = require('fs');
const request = require('request');
const validationErrorHelper = require('./multiple-error-helper');

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
    const endPoint = config.get('endpoints.ecm_api.base') + '/uploads';

    const profileMsg = `Finished processing ${originalFileName} (${fileUuid})`;
    winston.info(`Uploading file ${originalFileName} to ECM API at ${endPoint}`);
    winston.profile(profileMsg);
    return new Promise(function (resolve, reject) {
        // Define data to send to the Data Exchange service.
        const apiData = {
            url: endPoint,
            // gzip: true,
            timeout: 60000, // ms 60 seconds
            formData: {
                file: {
                    value: fs.createReadStream(filePath),
                    options: {
                        filename: originalFileName
                    }
                }
            },
            // TODO: Remove basic auth and add functionality to pass through auth token once integrated with the IDM
            auth: {
                user: config.get('endpoints.ecm_api.auth.username'),
                password: config.get('endpoints.ecm_api.auth.password'),
                sendImmediately: true
            }
        };

        // Make REST call into the Data Exchange service, and handle the result.
        request.post(apiData, function (err, httpResponse, body) {
            winston.profile(profileMsg);
            const statusCode = (!err && httpResponse && httpResponse.statusCode) ? httpResponse.statusCode : 3000;
            if (err) {
                winston.error('Error communicating with data-exchange API', err);
                reject({
                    isUserError: true,
                    errorCode: 3000
                });
            } else if (statusCode === 201) {
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

                const appStatusCode = bodyData.error_code || 3000;
                switch (appStatusCode) {
                    case 900: {
                        // Line errors
                        const groupedLineErrorData = validationErrorHelper.groupErrorData(bodyData.errors);

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
