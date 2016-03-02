

var CachHandler = require('../lib/cache-handler');
var Utils = require('../lib/utils');

module.exports = {
  getHandler: function (request, reply) {

    console.log(request.info.referrer);

    var ref = request.info.referrer;

    if (ref.search('/10-error-detail') === -1) {
      //process data from api
      return reply.view(request.path.substring(1));
    } else {
      //get cached data
      var sessionID = Utils.base64Decode(request.state['data-returns-id']);
      var cacheKey = sessionID + '_latestErrors';

      CachHandler.getValue(cacheKey)
        .then(function (data) {
          var errorData = JSON.parse(data);
          reply.view('02-send-your-data/09-errors', {
            uploadError: true,
            errorMessage: 'test message',
            lineErrors: errorData,
            isLineErrors: true
          });
        })
        .catch(function (err) {
          console.error(err);
        });
    }
  }






};