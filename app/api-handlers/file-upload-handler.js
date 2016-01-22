var FileSystem = require('fs');
var Request = require('request');
var ErrorMessages = require('../lib/error-messages.js');
var config = require('../config/configuration_' + (process.env.NODE_ENV || 'local'));
var cacheHandler = require('../lib/cache-handler');
var Utils = require('../lib/utils');
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
  console.log('==> processResponse', body);

  if (err !== null) {
    console.log('\t processResponse() Error: ' + err);
    reject({
      isUserError: false,
      err: err,
      message: (err.code === ErrorMessages.ERROR_CODES.ECONNREFUSED)
        ? ErrorMessages.API.ECONNREFUSED
        : ErrorMessages.API.UNKNOWN
    });
  }
  // The HTTP request was successful; try to interpret the result.
  else {
    // Try to parse the response body as JSON.
    var parsedBody;
    try {
      parsedBody = JSON.parse(body);
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

    if (response.statusCode !== config.API.STATUS_CODES.OK) {
      console.log('\t processResponse error: Response Code- ' + response.statusCode);
      // The REST call resulted in an error.
      reject({
        isUserError: false,
        message: parsedBody.message,
        apiErrors: parsedBody.errors
      });
    } else {
      var appStatusCode = parseInt(parsedBody.appStatusCode);
      console.log('\t processResponse- app status code:', appStatusCode);

      if (appStatusCode === ErrorMessages.ERROR_CODES.SUCCESSFULL) {

        successCallback(parsedBody);
      } else {
        var errMessage, apiErrors;
        switch (appStatusCode) {
          case ErrorMessages.ERROR_CODES.SUCCESSFULL:
            successCallback(parsedBody);
            apiErrors = '';
            break;
          case ErrorMessages.ERROR_CODES.UNSUPPORTED_FILE_TYPE:
            errMessage = ErrorMessages.API.NOT_CSV;
            apiErrors = '';
            break;
          case ErrorMessages.ERROR_CODES.INVALID_CONTENTS:
            errMessage = ErrorMessages.API.INVALID_CONTENTS;
            apiErrors = '';
            break;
          case ErrorMessages.ERROR_CODES.NO_RETURNS:
            errMessage = ErrorMessages.API.NO_RETURNS;
            apiErrors = '';
            break;
          case ErrorMessages.ERROR_CODES.MULTIPLE_RETURNS:
            errMessage = ErrorMessages.API.MULTIPLE_RETURNS;
            apiErrors = '';
            break;
          case ErrorMessages.ERROR_CODES.MULTIPLE_PERMITS:
            errMessage = ErrorMessages.API.MULTIPLE_PERMITS;
            apiErrors = '';
            break;
          case ErrorMessages.ERROR_CODES.VALIDATION_ERRORS :
            errMessage = ErrorMessages.API.SCHEMA_ERROR_MESSAGE;
            apiErrors = parsedBody.validationResult.schemaErrors;


            var lineErrorData = [];
            var lineErrors = apiErrors.lineErrors;
            var temp;
            var x = 0;

            for (var lineErrorName in lineErrors) {
              var lineError = {};
              x++;
              if (x > 10) {
                break;
              }
              temp = lineErrors[lineErrorName];
              lineError.outputLineNo = parseInt(temp.outputLineNo, 10);
              lineError.columnName = temp.columnName;
              lineError.errorValue = temp.errorValue;
              lineError.outputMessage = temp.errorDetail.outputMessage;
              lineErrorData.push(lineError);
            }
            // sort by line number
            var sortedLineErrorData = lineErrorData.sort(Utils.sortByProperty('outputLineNo'));

            break;

          default:
            errMessage = ErrorMessages.API.UNKNOWN;
            apiErrors = null;
        }

        reject({
          isUserError: true,
          message: errMessage,
          lineErrors: sortedLineErrorData,
          lineErrorCount: (apiErrors && apiErrors.errorCount) ? apiErrors.errorCount : 0
        });
      }

    }
    console.log('<== processResponse');
  }
}

/**
 * Uploads a file to the Data Exchange service.
 * @param filePath Full path to the file to upload.
 * @param sessionID the users sessionID
 * @returns {Promise} A promise that is fulfilled when the upload completes
 *   successfully, or is rejected if an error occurs.  If successful, the
 *   promise is resolved with an object containing the fields 'fileKey',
 *   'eaId', 'siteName' and 'returnType' as returned from the API.  For
 *   rejection details see processApiResponse().
 */
module.exports.uploadFileToService = function (filePath, sessionID) {
  console.log('==> uploadFileToService() url: ' + config.API.endpoints.FILEUPLOAD);
  return new Promise(function (resolve, reject) {
    // Define data to send to the Data Exchange service.
    var apiData = {
      url: config.API.endpoints.FILEUPLOAD,
      formData: {
        fileUpload: FileSystem.createReadStream(filePath)
      }
    };
    // Define a function for handling a successful response.
    var successHandler = function (jsonResponse) {
      console.log('==> successHandler()');
      var key = sessionID + '_UploadResult';
      if (jsonResponse) {
        console.log('<== successHandler() resolve(true) ');
        cacheHandler.setValue(key, jsonResponse)
          .then(function (result) {
            console.log('<== successHandler() resolve(true) ');
            resolve(jsonResponse);
          })
          .catch(function (result) {
            console.log('<== successHandler() error: ' + result);
            reject();
          });
      }
    };
    // Make REST call into the Data Exchange service, and handle the result.
    Request.post(apiData, function (err, response, body) {
      console.log('<== uploadFileToService() response received');
      processResponse(err, response, body, reject, successHandler);
    });
  });
};
