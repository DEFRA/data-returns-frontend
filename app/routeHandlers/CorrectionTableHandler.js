

var cachHandler = require('../lib/cache-handler');
var utils = require('../lib/utils');
var errorHelper = require('../lib/error-handler');
var errBit = require('../lib/errbitErrorMessage');

module.exports = {
  /*
   * http GET handler for /correction/table
   */
  getHandler: function (request, reply) {

    console.log(request.info.referrer);
    var sessionID = utils.base64Decode(request.state['data-returns-id']);
    var ref = request.info.referrer;

    if (ref.search('/10-error-detail') === -1) {
      //process data from api
      //return reply.view(request.path.substring(1));

      var key = sessionID + '-error-page-metadata';

      cachHandler.getValue(key)
        .then(function (metadata) {
          metadata = JSON.parse(metadata);
          reply.view('data-returns/correction-table', metadata);
        });


    } else {
      //get cached data
      var cacheKey = sessionID + '_latestErrors';

      cachHandler.getValue(cacheKey)
        .then(function (data) {
          var errorData = JSON.parse(data);
          reply.view('data-returns/correction-table', {
            uploadError: true,
            errorMessage: 'test message',
            lineErrors: errorData,
            isLineErrors: true,
            errorsummary: errorHelper.render(900)
          });
        })
        .catch(function (err) {
          var msg = new errBit.errBitMessage(err, __filename, 'getHandler', 47);
          console.error(msg);
        });
    }
  }






};