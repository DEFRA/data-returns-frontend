var FileSystem = require('fs');
var Request = require('request');
var config = require('../config/configuration_' + (process.env.NODE_ENV || 'local'));
var cacheHandler = require('../lib/cache-handler');
var Utils = require('../lib/utils');
var validationErrorHelper = require('./multiple-error-helper');
var ErrorHandler = require('../lib/error-handler');

/**
 * Uploads a file to the Data Exchange service.
 * @param filePath Full path to the file to upload.
 * @param sessionID the users sessionID
 * @param originalFileName the original client side file name uploaded by the user.
 * @returns {Promise} A promise that is fulfilled when the upload completes
 *   successfully, or is rejected if an error occurs.  If successful, the
 *   promise is resolved with an object containing the fields 'fileKey',
 *   'eaId', 'siteName' and 'returnType' as returned from the API.  
 */
module.exports.uploadFileToService = function (filePath, sessionID, originalFileName) {
  console.log('==> uploadFileToService() url: ' + config.API.endpoints.FILEUPLOAD);
  return new Promise(function (resolve, reject) {
    // Define data to send to the Data Exchange service.
    var apiData = {
      url: config.API.endpoints.FILEUPLOAD,
      formData: {
        fileUpload: FileSystem.createReadStream(filePath)
      }
    };


    var startTime = new Date();
    console.log('Post to API ', startTime);

    // Make REST call into the Data Exchange service, and handle the result.
    Request.post(apiData, function (err, httpResponse, body) {
      var endTime = new Date();

      var totalTime = new Date(endTime - startTime);

      console.log('<== uploadFileToService() response received ', startTime, endTime, totalTime.getMilliseconds() +'ms',(totalTime.getMilliseconds()/1000) + ' seconds');

      console.log('\t' + body);

      var statusCode = (!err && httpResponse && httpResponse.statusCode) ? httpResponse.statusCode : 3000;
      var errorsummary, apiErrors = '';

      if (err) {
        reject({
          isUserError: true,
          message: ErrorHandler.render(3000)
        });
      } else if (statusCode === 200) {
        //File sent, received and processed successfully
        httpResponse = JSON.parse(body);
        var key = sessionID + '_UploadResult';
        if (httpResponse) {
          httpResponse.originalFileName = originalFileName;
          cacheHandler.setValue(key, httpResponse)
            .then(function () {
              resolve(httpResponse);
            })
            .catch(function (result) {
              console.error('<== successHandler() error: ' + result, httpResponse);
              reject();
            });
        }

      } else {
        //There are validation errors
        console.error('file-upload-handler.processResponse()', body);
        httpResponse = JSON.parse(body);
        var appStatusCode = (httpResponse && httpResponse.appStatusCode) ? httpResponse.appStatusCode : 3000;
        var lineErrorData;
        var lineErrors;
        var temp;
        var lineError;
        var sortedLineErrorData;
        var lineErrorName;

        switch (appStatusCode) {
          case 900://Line errors

            errorsummary = ErrorHandler.render(900, {filename: originalFileName});
            apiErrors = httpResponse.validationErrors;
            lineErrorData = [];
            lineErrors = apiErrors; //apiErrors.lineErrors;
            temp;
            lineError;

            for (lineErrorName in lineErrors) {
              lineError = {};
              temp = lineErrors[lineErrorName];
              lineError.lineNumber = parseInt(temp.lineNumber, 10);
              lineError.fieldName = temp.fieldName;
              lineError.errorValue = temp.errorValue;
              lineError.errorMessage = ErrorHandler.render(temp.errorCode,
                {
                  filename: originalFileName,
                  Correction: true,
                  CorrectionDetails: false,
                  CorrectionMoreHelp: false
                }, temp.errorMessage);
              lineError.errorCode = 'DR' + Utils.pad(temp.errorCode, 4);
              lineError.errorType = temp.errorType;
              lineError.moreHelp = ErrorHandler.render(temp.errorCode,
                {
                  filename: originalFileName,
                  Correction: false,
                  CorrectionDetails: false,
                  CorrectionMoreHelp: true,
                  MoreHelpLink: temp.helpReference
                }, temp.errorMessage);
              //lineError.helpReference = temp.helpReference;
              lineError.definition = temp.definition ? temp.definition : temp.fieldName;
              lineError.Correction = true;
              lineError.CorrectionDetails = true;
              lineError.CorrectionMoreHelp = true;
              lineErrorData.push(lineError);
            }

            sortedLineErrorData = lineErrorData.sort(Utils.sortByProperty('fieldName'));
            sortedLineErrorData = validationErrorHelper.groupErrorData(sortedLineErrorData);

            reject({
              isUserError: true,
              errorsummary: errorsummary,
              lineErrors: sortedLineErrorData,
              lineErrorCount: sortedLineErrorData.length
            });

            break;
          default:
            //other errors
            var defaultErrorMessage = httpResponse.message;
            reject({
              isUserError: true,
              errorCode: appStatusCode,
              message: ErrorHandler.render(appStatusCode, null, defaultErrorMessage),
              errorsummary: ErrorHandler.render(appStatusCode, null, defaultErrorMessage),
              lineErrors: sortedLineErrorData,
              lineErrorCount: (apiErrors && apiErrors.errorCount) ? apiErrors.errorCount : 0,
              defaultErrorMessage: defaultErrorMessage
            });
            break;
        }
      }
    });
  });
};
