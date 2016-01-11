
var Utils = require('../lib/utils');
var CsvValidator = require('../lib/csv-validator');
var Path = require('path');
var config = require('../config/config.' + (process.env.NODE_ENV || 'development'));
var FileUploadHandler = require('../api-handlers/file-upload-handler');
var CachHandler = require('../lib/cache-handler');

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
      return FileUploadHandler.uploadFileToService(newLocalName, sessionID);
    })
    .then(function (apiResponse) {
      reply.redirect('/02-send-your-data/02-verify-your-file');
    }).catch(function (errorData) {
    request.log(['error', 'file-upload'], Utils.getBestLogMessageFromError(errorData));
    request.session.clear('returnMetaData');
    if ((errorData !== null) && ('isUserError' in errorData) && errorData.isUserError) {
      reply.view('02-send-your-data/01-upload-your-data', {
        uploadError: true,
        errorMessage: errorData.message
      });
    } else {
      request.session.flash('errorMessage', errorData.message);
      reply.redirect('/02-send-your-data/07-failure');
    }
  });
};