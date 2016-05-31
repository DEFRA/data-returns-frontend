
var utils = require('../lib/utils');
var cacheHandler = require('../lib/cache-handler');
var HelpLinks = require('../config/dep-help-links');
var errBit = require('../lib/errbitErrorMessage');

module.exports = {
  /*
   * HTTP GET Handler for the /file/confirm route
   * @Param request
   * @param reply
   */
  getHandler: function (request, reply) {
    console.log('==> O2O2Handler getHandler() ');
    var sessionID = utils.base64Decode(request.state['data-returns-id']);
    var key = sessionID + '_UploadResult';

    cacheHandler.getValue(key)
      .then(function (data) {

        console.log(data);
        data = JSON.parse(data);

        var uploadResult = data.uploadResult;
        var parseResult = data.parseResult;
        var mappings = parseResult.mappings;
        var originalFileName = data.originalFileName;

        var metaData = {
          fileKey: uploadResult.fileKey,
          mappings: mappings,
          filename: originalFileName,
          RegimeSpecificRules: HelpLinks.links.RegimeSpecificRules,
          HowToFormatEnvironmentAgencyData: HelpLinks.links.HowToFormatEnvironmentAgencyData
        };

        reply.view('data-returns/confirm-your-file', {
          data: metaData
        });

      })
      .catch(function (err) {
        var msg = new errBit.errBitMessage(err, __filename, 'getHandler', 46);
        console.error(msg);
      });

  },
  /*
   * HTTP POST Handler for the /file/confirm route
   * @Param request
   * @param reply
   * Redirects the current page
   */
  postHandler: function (request, reply) {
    reply.redirect('/failure');
  }
};

