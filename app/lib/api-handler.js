'use strict';

const FileSystem = require('fs');
const Request = require('request');
const ApiRoutes = require('./api-routes.js');
const ErrorMessages = require('./error-messages.js');

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
function processApiResponse(err, response, body, reject, successCallback) {
    /// Did the HTTP request itself fail?
    if (err !== null) {
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
        try {
            var parsedBody = JSON.parse(body);
            if (response.statusCode !== ApiRoutes.STATUS_CODES.OK) {
                // The REST call resulted in an error.
                reject({
                    isUserError: false,
                    message: parsedBody.message,
                    apiErrors: parsedBody.errors
                });
            } else if (parsedBody.appStatusCode !== 800) {
                // TODO: Avoid hard-coding the '800' code above.
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
 * Uploads a file to the Data Exchange service.
 * @param filePath Full path to the file to upload.
 * @returns {Promise} A promise that is fulfilled when the upload completes
 *   successfully, or is rejected if an error occurs.  If successful, the
 *   promise is resolved with an object containing the fields 'fileKey',
 *   'eaId', 'siteName' and 'returnType' as returned from the API.  For
 *   rejection details see processApiResponse().
 */
module.exports.uploadFileToService = function(filePath) {
    // TODO: Validate input parameter.
    return new Promise(function (resolve, reject) {
        // Define data to send to the Data Exchange service.
        var apiData = {
            url: ApiRoutes.routing.FILEUPLOAD,
            formData: {
                fileUpload: FileSystem.createReadStream(filePath)
            }
        };

        // Define a function for handling a successful response.
        var successHandler = function(jsonResponse) {
            // TODO: Handle unexpected JSON responses.
            resolve({
                fileKey: jsonResponse.fileKey,
                eaId: jsonResponse.eaId,
                siteName: jsonResponse.siteName,
                returnType: jsonResponse.returnType
            });
        };

        // Make REST call into the Data Exchange service, and handle the result.
        Request.post(apiData, function (err, response, body) {
            processApiResponse(err, response, body, reject, successHandler);
        });
    });
};

/**
 * Asks the Data Exchange service to validate the contents of a previously-
 * uploaded file.
 * @param returnMetaData A copy of the meta data returned when the file was
 *   uploaded to the service.
 * @returns {Promise} A promise that is fulfilled when validation completes
 *   successfully, or is rejected if an error occurs.  If successful, the
 *   promise is resolved with Boolean true.  For rejection details see
 *   processApiResponse().
 */
module.exports.validateFileContents = function(returnMetaData) {
    // TODO: Convert this so that the API only requires the File Key and accepts JSON.
    // TODO: Validate input parameter.
    return new Promise(function (resolve, reject) {
        // Define data to send to the Data Exchange service.
        var apiData = {
            url: ApiRoutes.routing.FILEUPLOADVALIDATE,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            qs: returnMetaData
        };

        // Define a function for handling a successful response.
        var successHandler = function() {
            resolve(true);
        };

        // Make REST call into the Data Exchange service.
        Request.get(apiData, function (err, response, body) {
            processApiResponse(err, response, body, reject, successHandler);
        });
    });
};

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
module.exports.confirmFileSubmission = function(fileKey, userEmail) {
    // TODO: Validate input parameters.
    // TODO: Convert this so that the API accepts JSON.
    // TODO: Remove 'userEmail' when the API stops sending emails.
    return new Promise(function (resolve, reject) {
        // Define data to send to the Data Exchange service.
        var apiData = {
            url: ApiRoutes.routing.FILEUPLOADSEND,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            formData: {
                fileKey: fileKey,
                userEmail: userEmail
            }
        };

        // Define a function for handling a successful response.
        var successHandler = function() {
            resolve(true);
        };

        // Make REST call into the Data Exchange service.
        Request.post(apiData, function (err, response, body) {
            processApiResponse(err, response, body, reject, successHandler);
        });
    });
};