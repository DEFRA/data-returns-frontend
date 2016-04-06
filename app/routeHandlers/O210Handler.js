
var config = require('../config/configuration_' + (process.env.NODE_ENV || 'local'));
var cacheHandler = require('../lib/cache-handler');
var Utils = require('../lib/utils');

module.exports = {
  getHandler: function (request, reply) {

    var groupid = request.query.groupid;
    var key = 'ErrorData_' + groupid;
    var sessionID = Utils.base64Decode(request.state['data-returns-id']);
    
    var filekey = sessionID + '_SourceName';
    filekey = sessionID + '_SourceName';
    cacheHandler.getValue(filekey)
      .then(function (fileName) {
        fileName = fileName ? fileName.replace(/"/g, '') : '';
        cacheHandler.getValue(key)
          .then(function (result) {

            result = JSON.parse(result);
            //re-sort the data by row number
            result = result.sort(Utils.sortByProperty('rowNumber'));

            //get the first error and extract basic error details
            var firstError = result[0];
            var rowText = '';
            var item;
            var errorType = firstError.errorType;

            for (var i = 0; i < result.length; i++) {
              item = result[i];
              rowText += rowText !== '' ? ', ' + item.rowNumber : item.rowNumber;
            }

            reply.view('02-send-your-data/10-error-detail', {
              fileName: fileName,
              deplink: config.dep.returnTypeRulesLink,
              columnName: firstError.columnName,
              errorMessage: firstError.errorMessage,
              rows: rowText,
              errorType: errorType,
              isMissing: (errorType.toLowerCase() === 'missing') ? true : false,
              isIncorrect: (errorType.toLowerCase() === 'invalid') ? true : false,
              data: result
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