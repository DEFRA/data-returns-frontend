'use strict';
var Request = require('request');
var ErrorMessages = require('../lib/error-messages.js');
var config = require('../config/config.' + (process.env.NODE_ENV || 'development'));
/**
 * Helper that handles response from the Data Exchange service API.  It is
 * intended to be called from the callback of a 'Request' library call.
 * @param err The 'err' parameter from the Request callback.  This captures
 *   JavaScript / usage errors.
 * @param response The 'response' parameter from the Request callback.  This
 *   contains header-like information from the HTTP response.
 * @param body The 'body' parameter from the Request callback.  This captures
 *   the body of the HTTP response.
 * @param reject A promise rejection function that will be called directly
 *   if this method detects that the request was unsuccessful.  The rejection
 *   will contain some / all of the following fields:
 *     isUserError  - A Boolean;
 *     message      - A string message suitable for displaying to the user;
 *     err          - A JavaScript error, not intended for display to the user;
 *     apiErrors    - Object capturing detail of errors returned by the Data
 *                    Exchange service API call;
 *     rawResponse  - A copy of the 'response' parameter, only included when
 *                    this handler could not parse response or body itself.
 * @param successCallback A function that will be called if the response from
 *   the Data Exchange service indicates success.  The method will be called
 *   with an object containing the parsed body of the API reply.
 */
function processResponse(err, response, body, reject, successCallback) {
  /// Did the HTTP request itself fail?
  if (err !== null) {
    reject({
      isUserError: false,
      err: err,
      message: (err.code === ErrorMessages.ERROR_CODES.ECONNREFUSED)
        ? ErrorMessages.API.ECONNREFUSED
        : ErrorMessages.API.UNKNOWN
    });
  } else {
    // Try to parse the response body as JSON.
    try {
      var parsedBody = JSON.parse(body);
      if (response.statusCode !== config.API.STATUS_CODES.OK) {
        // The REST call resulted in an error.
        reject({
          isUserError: false,
          message: parsedBody.message,
          apiErrors: parsedBody.errors
        });
      } else if (parsedBody.appStatusCode !== ErrorMessages.API.APPLICATION_ERROR_CODE) {
        // REST call successful, but response indicates application-specific error.
        reject({
          isUserError: true,
          message: parsedBody.message,
          apiErrors: parsedBody.errors
        });
      } else {
        // Successful.
        successCallback(parsedBody);
      }
    } catch (err) {
      console.log(err);
      // An error occurred whilst parsing the response.
      reject({
        isUserError: false,
        err: err,
        message: ErrorMessages.API.UNKNOWN,
        rawResponse: response
      });
    }
  }
}



/**
 * Asks the Data Exchange service to submit a file that has previously been
 * uploaded and validated.
 * @param fileKey The file key returned when the file was uploaded to the
 *   service.
 * @param userEmail A string containing the user's email address.
 * @returns {Promise} A promise that is fulfilled when submission is
 *   successfully competed, or rejected if an error occurs.  If
 *   successful, the promise is resolve with Boolean true.  For rejection
 *   details see processApiResponse().
 */
module.exports.confirmFileSubmission = function (fileKey, userEmail) {

  return new Promise(function (resolve, reject) {
    // Define data to send to the Data Exchange service.
    var apiData = {
      //url: config.API.endpoints.FILEUPLOADSEND,
      url: config.API.endpoints.FILEUPLOADCOMPLETE + '/' + fileKey + '/' + userEmail
        /* headers: {
         'Content-Type': 'application/x-www-form-urlencoded'
         },
         formData: {
         fileKey: fileKey,
         userEmail: userEmail
         }*/
    };

    // Define a function for handling a successful response.
    var successHandler = function () {
      resolve(true);
    };

    // Make REST call into the Data Exchange service.
    Request.post(apiData, function (err, response, body) {
      processResponse(err, response, body, reject, successHandler);
    });
  });
};

//not used anymore retained incase 2 calls become 3 again due to performance issues
module.exports.validateFileContents = function (data) {

};