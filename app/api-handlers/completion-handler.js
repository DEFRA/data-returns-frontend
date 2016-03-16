'use strict';
var Request = require('request');
var config = require('../config/configuration_' + (process.env.NODE_ENV || 'local'));
var ErrorHandler = require('../lib/error-handler');
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

  var statusCode = (!err && response && response.statusCode) ? response.statusCode : 3000;

  switch (statusCode) {
    case 200:
      var parsedBody = JSON.parse(body);
      successCallback(parsedBody);
      break;
    default:
      console.log('completion-handler processResponse statuscode:', statusCode);
      reject({
        isUserError: false,
        err: err,
        message: ErrorHandler.render(3000),
        rawResponse: response
      });
      break;
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
module.exports.confirmFileSubmission = function (fileKey, userEmail, originalFileName, permitNo) {

  return new Promise(function (resolve, reject) {
    console.log('==> confirmFileSubmission ()');
    // Define data to send to the Data Exchange service.

    //public Response completeUpload(@NotEmpty @FormDataParam("fileKey") String orgFileKey, @NotEmpty @FormDataParam("userEmail") String userEmail,
    //@NotEmpty @FormDataParam("orgFileName") String orgFileName, @NotEmpty @FormDataParam("permitNo") String permitNo)
    var apiData = {
      url: config.API.endpoints.FILEUPLOADCOMPLETE,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      formData: {
        fileKey: fileKey,
        userEmail: userEmail,
        orgFileName: originalFileName,
        permitNo: permitNo
      }
    };
    console.log('\t calling api- apiData: ' + JSON.stringify(apiData));
    // Define a function for handling a successful response.
    var successHandler = function () {
      console.log('==> confirmFileSubmission successHandler() ');
      resolve(true);
    };
    // Make REST call into the Data Exchange service.
    Request.post(apiData, function (err, response, body) {
      console.log('==> confirmFileSubmission response received');
      processResponse(err, response, body, reject, successHandler);
    });
  });
};