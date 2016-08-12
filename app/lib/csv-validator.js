'use strict';
var avHandler = require('./antivirus-handler');
var fs = require('fs');
var errorHandler = require('./error-handler');
var config = require('../config/configuration_' + (process.env.NODE_ENV || 'local'));
const errbit = require("./errbit-handler");
var helpLinks = require('../config/dep-help-links');
var emptyFileErrorMessage = errorHandler.render(500, helpLinks.links, 'Your File is empty.');
/**
 * Inspects an uploaded file to see if it's a valid CSV file.
 * @param filePath Full path to the local copy of the file.
 * @returns {Promise} A promise that will be fulfilled (with a Boolean true)
 *   if the specified file passes validation, or will be rejected if
 *   validation fails.  The rejection value will contain some or all of the
 *   following fields:
 *     isUserError  - A Boolean;
 *     message      - A string message suitable for displaying to the user;
 *     err          - A JavaScript error, not intended for display to the user.
 */
var validateFile = function (filePath, fileSize) {
    return new Promise(function (resolve, reject) {
        try {
            if (fileSize === 0  || (!fileSize && fs.statSync(filePath).size === 0)) {
                // Reject all empty files
                reject({
                    isUserError: true,
                    errorSummary: emptyFileErrorMessage,
                    message: emptyFileErrorMessage,
                    errorCode: 500
                });
            } else if (config.CSV.validate !== true) {
                // If validation disabled, go no further!
                resolve(true);
            } else if ((filePath === null) || (typeof filePath !== 'string') || (filePath.length === 0)) {
                // Test that a filePath has been specified.
                reject({
                    isUserError: false,
                    message: null,
                    err: new Error('"filePath" parameter must be a non-empty string')
                });
            } else {
                // Check for viruses
                avHandler.isInfected(filePath).then(function () {
                    resolve(true);
                }).catch(function (result) {
                    if (result === true) {
                        let errorMessage = errorHandler.render(600);
                        reject({
                            isUserError: true,
                            message: errorMessage,
                            errorSummary: errorMessage,
                            errorCode: 600
                        });
                    } else {
                        errbit.notify(new Error("ClamAV system error unable to scan files!"));
                        let errorMessage = errorHandler.render(3000, {mailto: config.feedback.mailto});
                        reject({
                            isUserError: true,
                            err: errorMessage,
                            errorSummary: errorMessage,
                            errorCode: 3000
                        });
                    }
                });
            }
        } catch (e) {
            reject({
                isUserError: false,
                err: e
            });
        }
    });
};
module.exports.validateFile = validateFile;
