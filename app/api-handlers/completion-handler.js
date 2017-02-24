'use strict';
const winston = require("winston");
const config = require('../lib/configuration-handler.js').Configuration;

var request = require('request');
var crypto = require('../lib/crypto-handler');

/**
 * Asks the Data Exchange service to submit a file that has previously been
 * uploaded and validated.
 * @param fileKey The file key returned when the file was uploaded to the
 *   service.
 * @param userEmail A string containing the user's email address.
 * @param userEmail The email address entered by the user.
 * @param originalFileName Th original clientside file name uploaded.
 * @returns {Promise} A promise that is fulfilled when submission is
 *   successfully competed, or rejected if an error occurs.  If
 *   successful, the promise is resolve with Boolean true.  For rejection
 *   details see processApiResponse().
 */
module.exports.confirmFileSubmission = function (fileKey, userEmail, originalFileName) {

    let endPoint = config.get('api.base') + '/' + config.get('api.endpoints.fileUploadComplete');
    
    return new Promise(function (resolve, reject) {
        // Define data to send to the Data Exchange service.
        var apiData = {
            url: endPoint,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': crypto.calculateAuthorizationHeader(originalFileName + userEmail),
                'filename': originalFileName + userEmail
            },
            formData: {
                fileKey: fileKey,
                userEmail: userEmail,
                orgFileName: originalFileName
            }
        };
        
        winston.info('==> confirmFileSubmission() url: ' + endPoint);
        winston.info('\t calling api- apiData: ' + JSON.stringify(apiData));

        // Make REST call into the Data Exchange service.
        request.post(apiData, function (err, response, body) {
            var statusCode = (!err && response && response.statusCode) ? response.statusCode : 3000;

            switch (statusCode) {
                case 200:
                    resolve(true);
                    break;
                case 500:
                    if (body) {
                        body = JSON.parse(body);
                        winston.error(new Error(body.message));
                        reject();
                    }
                    break;
                default:
                    if (err) {
                        winston.error('Error communicating with data-exchange API', err);
                    }
                    winston.info('completion-handler processResponse statuscode:', statusCode);
                    reject();
                    break;
            }
        });
    });
};
