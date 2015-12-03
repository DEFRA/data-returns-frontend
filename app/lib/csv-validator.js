'use strict';

const Path = require('path');
const FileSystem = require('fs');
const ErrorMessages = require('./error-messages.js');

/**
 * Inspects an uploaded file to see if it's a valid CSV file.
 * @param filePath Full path to the local copy of the file.
 * @param contentType The "content-type" header from the HTTP request.
 * @returns {Promise} A promise that will be fulfilled (with a Boolean true)
 *   if the specified file passes validation, or will be rejected if
 *   validation fails.  The rejection value will contain some or all of the
 *   following fields:
 *     isUserError  - A Boolean;
 *     message      - A string message suitable for displaying to the user;
 *     err          - A JavaScript error, not intended for display to the user.
 */
var validateFile = function (filePath, contentType) {
    /* so what is a valid CSV file ?
     *
     * 1) CSV extension is required ?
     * 2) must not be zero bytes
     * 3) One of many mime types?
     * 4) Have at least 2 rows, 1 header and 1 data row?
     */

    return new Promise(function (resolve, reject) {
        // Test that a filePath has been specified.
        if ((filePath === null) || (typeof filePath !== 'string') || (filePath.length === 0)) {
            reject({
                isUserError: false,
                err: new Error('"filePath" parameter must be a non-empty string')
            });
        }

        // Test that a content type has been specified.
        else if ((contentType === null) || (typeof contentType !== 'string') || (contentType.length === 0)) {
            reject({
                isUserError: false,
                err: new Error('"contentType" parameter must be a non-empty string')
            });
        }

        // Test Content-Type header field.
        else if (contentType.toLowerCase() !== 'text/csv') {
            reject({
                isUserError: true,
                message: ErrorMessages.FILE_HANDLER.INVALID_CONTENT_TYPE
            });
        }

        // Test file extension.
        else if (Path.extname(filePath).toLowerCase() !== '.csv') {
            reject({
                isUserError: true,
                message: ErrorMessages.FILE_HANDLER.NOT_CSV
            });
        }

        // Test file is not empty.
        else {
            FileSystem.stat(filePath, function (err, stats) {
                if (err !== null) {
                    // Unknown error, oh dear.
                    reject({
                        isUserError: false,
                        err: err
                    });
                } else if (stats.size === 0) {
                    // File is empty.
                    reject({
                        isUserError: true,
                        message: ErrorMessages.FILE_HANDLER.ZERO_BYTES
                    });
                } else {
                    // All tests have passed; looks like a valid file.
                    resolve(true);
                }
            });
        }
    });
};

module.exports.validateFile = validateFile;
