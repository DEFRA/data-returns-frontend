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

    // Make REST call into the Data Exchange service, and handle the result.
    Request.post(apiData, function (err, parsedBody, body) {
      console.log('<== uploadFileToService() response received');

      var statusCode = (!err && parsedBody && parsedBody.statusCode) ? parsedBody.statusCode : 3000;
      var errMessage, apiErrors = '';

      if (statusCode === 200) {
        //File sent, received and processed successfully
        parsedBody = JSON.parse(body);
        var key = sessionID + '_UploadResult';

        if (parsedBody) {
          parsedBody.originalFileName = originalFileName;
          cacheHandler.setValue(key, parsedBody)
            .then(function () {
              resolve(parsedBody);
            })
            .catch(function (result) {
              console.error('<== successHandler() error: ' + result, parsedBody);
              reject();
            });
        }

      } else {
        //There are validation errors
        console.error('file-upload-handler.processResponse()', body);
        parsedBody = JSON.parse(body);

        var appStatusCode = (parsedBody && parsedBody.appStatusCode) ? parsedBody.appStatusCode : 3000;
        var lineErrorData;
        var lineErrors;
        var temp;
        var lineError;
        var sortedLineErrorData;
        var lineErrorName;

        switch (appStatusCode) {
          case 900://Line errors

            errMessage = ErrorHandler.render(900);
            apiErrors = parsedBody.validationResult.schemaErrors;

            lineErrorData = [];
            lineErrors = apiErrors.lineErrors;
            temp;
            lineError;

            for (lineErrorName in lineErrors) {

              lineError = {};

              temp = lineErrors[lineErrorName];
              lineError.outputLineNo = parseInt(temp.outputLineNo, 10);
              lineError.columnName = temp.columnName;
              lineError.errorValue = temp.errorValue;
              lineError.outputMessage = temp.errorDetail.outputMessage;
              lineErrorData.push(lineError);
            }

            sortedLineErrorData = lineErrorData.sort(Utils.sortByProperty('columnName'));
            sortedLineErrorData = validationErrorHelper.groupErrorData(sortedLineErrorData);
            
            reject({
              isUserError: true,
              message: errMessage,
              lineErrors: sortedLineErrorData,
              lineErrorCount: (apiErrors && apiErrors.errorCount) ? apiErrors.errorCount : 0
            });
            
            break;
          default:
            //other errors
            reject({
              isUserError: true,
              message: ErrorHandler.render(appStatusCode),
              lineErrors: sortedLineErrorData,
              lineErrorCount: (apiErrors && apiErrors.errorCount) ? apiErrors.errorCount : 0
            });
            break;
        }
      }
    });
  });
};
