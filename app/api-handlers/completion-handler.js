'use strict';
var Request = require('request');
var config = require('../config/configuration_' + (process.env.NODE_ENV || 'local'));
var ErrorHandler = require('../lib/error-handler');
var errBit = require('../lib/errbitErrorMessage');

/**
 * Asks the Data Exchange service to submit a file that has previously been
 * uploaded and validated.
 * @param fileKey The file key returned when the file was uploaded to the
 *   service.
 * @param userEmail A string containing the user's email address.
 * @param userEmail The email address entered by the user.
 * @param originalFileName Th original clientside file name uploaded.
 * @param permitNo The EA_ID (permit number) 
 * @returns {Promise} A promise that is fulfilled when submission is
 *   successfully competed, or rejected if an error occurs.  If
 *   successful, the promise is resolve with Boolean true.  For rejection
 *   details see processApiResponse().
 */
module.exports.confirmFileSubmission = function (fileKey, userEmail, originalFileName, permitNo) {

  return new Promise(function (resolve, reject) {
    console.log('==> confirmFileSubmission ()');
    // Define data to send to the Data Exchange service.
    var apiData = {
      url: config.API.endpoints.FILEUPLOADCOMPLETE,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      formData: {
        fileKey: fileKey,
        userEmail: userEmail,
        orgFileName: originalFileName
      }
    };
    console.log('\t calling api- apiData: ' + JSON.stringify(apiData));

    // Make REST call into the Data Exchange service.
    Request.post(apiData, function (err, response, body) {
      console.log('==> confirmFileSubmission response received');

      var statusCode = (!err && response && response.statusCode) ? response.statusCode : 3000;

      switch (statusCode) {
        case 200:
          resolve(true);
          break;
        case 500:
          if (body) {
            body = JSON.parse(body);
            var msg = new errBit.errBitMessage(body.message, __filename, 'confirmFileSubmission()', 52);
            console.error(msg);
            reject();
            break;
          }
        default:
          if (err) {
            var msg = new errBit.errBitMessage(err, __filename, 'confirmFileSubmission()', 56);
            console.error(msg);
          }
          console.log('completion-handler processResponse statuscode:', statusCode);
          reject();
          break;
      }
    });
  });
};