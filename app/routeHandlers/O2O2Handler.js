
//var CacheHandler = require('../lib/cache-handler');
//path: '/02-send-your-data/02-confirm-your-file',
//var userHandler = require('../lib/user-handler');

var Utils = require('../lib/utils');
var CacheHandler = require('../lib/cache-handler');
var HelpLinks = require('../config/dep-help-links');

module.exports = {
  /*
   * HTTP GET Handler for the /02-send-your-data/02-confirm-your-file route
   * @Param request
   * @param reply
   */
  getHandler: function (request, reply) {
    //var key = 'id_' + request.session.id + '_UploadResult';
    console.log('==> O2O2Handler getHandler() ');
    var sessionID = Utils.base64Decode(request.state['data-returns-id']);

    var key = sessionID + '_UploadResult';

    CacheHandler.getValue(key)
      .then(function (data) {
        data = JSON.parse(data);
      
        var uploadResult = data.uploadResult;
		var parseResult = data.parseResult;
		        
        var metaData = {
          fileKey: uploadResult.fileKey,
          eaId: parseResult.permitNumber,
          siteName: parseResult.siteName,
          returnType: parseResult.returnType,
          RegimeSpecificRules: HelpLinks.links.RegimeSpecificRules,
          HowToFormatEnvironmentAgencyData: HelpLinks.links.HowToFormatEnvironmentAgencyData
        };

        reply.view('02-send-your-data/02-confirm-your-file', {
          returnMetaData: metaData
        });

      })
      .catch(function (err) {
        console.error('0202Handler', err);
      });

  },
  /*
   * HTTP POST Handler for the /02-send-your-data/02-confirm-your-file route
   * @Param request
   * @param reply
   * Redirects the current page
   */
  postHandler: function (request, reply) {
    reply.redirect('/02-send-your-data/06-failure');
  }
};

