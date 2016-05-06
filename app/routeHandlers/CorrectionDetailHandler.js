
var config = require('../config/configuration_' + (process.env.NODE_ENV || 'local'));
var cacheHandler = require('../lib/cache-handler');
var Utils = require('../lib/utils');
var DetailsHandler = require('../api-handlers/multiple-error-helper');
var ErrorHandler = require('../lib/error-handler');
module.exports = {
  
  /*
   * HTTP GET Handler for /correction/detail route
   */
  getHandler: function (request, reply) {

    var errorID = request.query.id;
    var sessionID = Utils.base64Decode(request.state['data-returns-id']);
    var key = sessionID + '-ErrorData-' + errorID;//'ErrorData_' + groupid;
    var filekey = sessionID + '_SourceName';
    filekey = sessionID + '_SourceName';
    cacheHandler.getValue(filekey)
      .then(function (fileName) {
        fileName = fileName ? fileName.replace(/"/g, '') : '';
        cacheHandler.getValue(key)
          .then(function (result) {

            result = JSON.parse(result);

            DetailsHandler.getErrorDetails(result)
              .then(function (data) {

                //get the first error and extract basic error details
                var firstError = data[0];
                var errorCode = firstError.errorCode;
                var columnName = firstError.columnName;
                var errorSummary = ErrorHandler.render(errorCode,
                  {
                    filename: fileName,
                    Correction: false,
                    CorrectionDetails: true,
                    CorrectionMoreHelp: true,
                    columnName: columnName,
                    errorCode: errorCode,
                    MoreHelpLink: firstError.helpReference
                  }, firstError.errorMessage);

                reply.view('data-returns/correction-detail', {
                  fileName: fileName,
                  columnName: firstError.columnName,
                  errorSummary: errorSummary,
                  errorCode: errorCode,
                  data: data
                });
              });
          })
          .catch(function (err) {
            console.error('Error getting ' + key, err);
          });
      })
      .catch(function (err) {
        console.error('Error getting ' + key, err);
      });

  }

};