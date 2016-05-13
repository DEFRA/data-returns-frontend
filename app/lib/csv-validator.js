'use strict';
var Path = require('path');
var FileSystem = require('fs');
var ErrorMessages = require('./error-messages.js');
var avHandler = require('./anitvirus-handler');
var ErrorHandler = require('./error-handler');
var config = require('../config/configuration_' + (process.env.NODE_ENV || 'local'));
var errBit = require('./errbitErrorMessage');

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
    console.log('==> validateFile() ');
    var errorMessage;
    // Test that a filePath has been specified.
    if ((filePath === null) || (typeof filePath !== 'string') || (filePath.length === 0)) {
      console.log('\t file path is empty!');
      reject({
        isUserError: false,
        err: new Error('"filePath" parameter must be a non-empty string')
      });
    } else {
      //virus scan the file
      avHandler.isInfected(filePath)
        .then(function (result) {
          if (result === false) {
            // Test that a content type has been specified.
            if ((contentType === null) || (typeof contentType !== 'string') || (contentType.length === 0)) {
              reject({
                isUserError: false,
                err: new Error('"contentType" parameter must be a non-empty string')
              });
            }

            // Test file extension.
            else if (Path.extname(filePath).toLowerCase() !== '.csv') {
              console.log('\t ' + ErrorMessages.FILE_HANDLER.NOT_CSV);
              reject({
                isUserError: true,
                message: ErrorMessages.FILE_HANDLER.NOT_CSV
              });
            }

            // Test file is not empty.
            else {

              FileSystem.stat(filePath, function (err, stats) {
                if (err !== null) {
                  reject({
                    isUserError: false,
                    err: err
                  });
                } else if (stats.size === 0) {
                  // File is empty.
                  var errorMessage = ErrorHandler.render(500);
                  reject({
                    isUserError: true,
                    message: errorMessage
                  });

                } else {
                  // All tests have passed; looks like a valid file.
                  console.log('<== validateFile() the file is valid');
                  resolve(true);
                }
              });
            }

          }
        })
        .catch(function (result) {
          if (result === true) {
            errorMessage = ErrorHandler.render(600);

            reject({
              isUserError: true,
              message: errorMessage,
              errorSummary: errorMessage,
              errorCode: 600
            });

          } else {
            var msg = new errBit.errBitMessage('ClamAV system error unable to scan files!', __filename, 'isInfected()', 102);
            console.error(msg);
            errorMessage = ErrorHandler.render(3000, {mailto: config.feedback.mailto}),
              reject({
                isUserError: true,
                err: errorMessage,
                errorSummary: errorMessage,
                errorCode: 3000
              });
          }

        });
    }
  });
};
module.exports.validateFile = validateFile;
