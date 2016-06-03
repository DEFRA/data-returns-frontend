'use strict';

var fs = require('fs');
var avHandler = require('./anitvirus-handler');
var errorHandler = require('./error-handler');
var config = require('../config/configuration_' + (process.env.NODE_ENV || 'local'));
var errBit = require('./errbitErrorMessage');
var helpLinks = require('../config/dep-help-links');
var emptyFileErrorMessage = errorHandler.render(500, helpLinks.links, 'Your File is empty.');
var notCSVMessage = errorHandler.render(400, helpLinks.links, 'Your File is not a csv.');
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
var validateFile = function (filePath) {
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
        message: null,
        err: new Error('"filePath" parameter must be a non-empty string')
      });
    } else {
//virus scan the file
      avHandler.isInfected(filePath)
      .then(function (result) {
        if (result === false) {

          try {
            if (filePath && filePath.indexOf('.csv') === -1) {

              reject({
                isUserError: true,
                message: notCSVMessage,
                errorSummary: notCSVMessage,
                errorCode: 400
              });
            } else {

              fs.stat(filePath, function (err, stats) {
                if (err !== null) {
                  if (err.code === 'ENOENT') {
                    reject({
                      isUserError: false,
                      err: new Error('"filePath" file not found on disc')
                    });
                  }

                } else if (stats.size === 0) {
                  reject({
                    isUserError: true,
                    errorSummary: emptyFileErrorMessage,
                    message: emptyFileErrorMessage,
                    errorCode: 500
                  });
                } else {
                  console.log('<== validateFile() the file is valid');
                  resolve(true);
                }
              });
            }
          } catch (e) {
            console.log(e);
          }
        }
      })
      .catch(function (result) {
        if (result === true) {
          errorMessage = errorHandler.render(600);
          reject({
            isUserError: true,
            message: errorMessage,
            errorSummary: errorMessage,
            errorCode: 600
          });
        } else {
          var msg = new errBit.errBitMessage('ClamAV system error unable to scan files!', __filename, 'isInfected()', 102);
          console.error(msg);
          errorMessage = errorHandler.render(3000, {mailto: config.feedback.mailto}),
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
