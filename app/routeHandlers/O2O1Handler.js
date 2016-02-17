
var Utils = require('../lib/utils');
var CsvValidator = require('../lib/csv-validator');
var Path = require('path');
var config = require('../config/configuration_' + (process.env.NODE_ENV || 'local'));
var FileUploadHandler = require('../api-handlers/file-upload-handler');
var CachHandler = require('../lib/cache-handler');
var HelpLinks = require('../config/dep-help-links');
/*
 *  HTTP POST handler for /02-send-your-data/01-upload-your-data
 *  @Param request
 *  @Param reply
 */
module.exports.postHandler = function (request, reply) {

  request.log(['info', 'file-upload'], 'Processing uploaded file...');
  var contentType = request.payload.fileUpload.headers['content-type'] || null;
  var sourceName = request.payload.fileUpload.filename;
  var oldLocalName = request.payload.fileUpload.path;
  var newLocalName = oldLocalName.concat(Path.extname(sourceName));
  var sessionID = 'id_' + request.session.id;
  var key = sessionID + '_FilePath';
  var oldkey = sessionID + '_SourceName';
  Utils.renameFile(oldLocalName, newLocalName)
    .then(function () {
      if (config.CSV.validate === true) {
        return CsvValidator.validateFile(newLocalName, contentType);
      } else {
        return true;
      }
    })
    .then(function () {
      //cache the filenames
      CachHandler.setValue(oldkey, sourceName);
    })
    .then(function () {
      CachHandler.setValue(key, newLocalName);
    })
    .then(function () {
      return FileUploadHandler.uploadFileToService(newLocalName, sessionID, sourceName);
    })
    .then(function (data) {

      var uploadResult = data.uploadResult;
      var generalResult = data.generalResult.transformationResults.results;
      var metaData = {
        fileKey: uploadResult.fileKey,
        eaId: generalResult.Result_EA_ID.value,
        siteName: generalResult.Result_Site_Name.value,
        returnType: generalResult.Result_Rtn_Type.value,
        RegimeSpecificRules: HelpLinks.links.RegimeSpecificRules,
        HowToFormatEnvironmentAgencyData: HelpLinks.links.HowToFormatEnvironmentAgencyData
      };
      console.log('\t metadata: ', metaData);
      reply.view('02-send-your-data/02-verify-your-file', {
        returnMetaData: metaData
      });
    }).catch(function (errorData) {
    console.log('==> promise catch block ' + JSON.stringify(errorData));
    request.log(['error', 'file-upload'], Utils.getBestLogMessageFromError(errorData));
    request.session.clear('returnMetaData');
    if ((errorData !== null) && ('isUserError' in errorData) && errorData.isUserError) {

      var isLineErrors = errorData.lineErrorCount && errorData.lineErrorCount > 0 ? true : false;
      var sessionid = 'id_' + request.session.id;
      var cacheKey = sessionid + '_latestErrors';
      CachHandler.setValue(cacheKey, errorData.lineErrors)
        .then(function (result) {
          var filekey = sessionID + '_SourceName';
          filekey = sessionid + '_SourceName';
          CachHandler.getValue(filekey)
            .then(function (fileName) {
              fileName = fileName ? fileName.replace(/"/g, "") : '';
              reply.view((isLineErrors === true) ? '02-send-your-data/09-errors' : '02-send-your-data/01-upload-your-data', {
                uploadError: true,
                errorMessage: errorData.message,
                fileName: fileName,
                lineErrors: errorData.lineErrors,
                isLineErrors: errorData.lineErrors ? true : false,
                HowToFormatEnvironmentAgencyData: HelpLinks.links.HowToFormatEnvironmentAgencyData
              });
            });
        })
        .catch(function (err) {
          console.error(err);
        });
    } else {
      request.session.flash('errorMessage', errorData.message);
      reply.redirect('/02-send-your-data/07-failure');
    }
  });
};