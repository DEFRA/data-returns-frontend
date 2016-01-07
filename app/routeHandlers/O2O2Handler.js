
var CacheHandler = require('../lib/cache-handler');
//path: '/02-send-your-data/02-verify-your-file',

module.exports = {
  /*
   * HTTP GET Handler for the /02-send-your-data/02-verify-your-file route
   * @Param request
   * @param reply
   */
  getHandler: function (request, reply) {
    var key = 'id_' + request.session.id + '_UploadResult';
    CacheHandler.getValue(key)
      .then(function (data) {
        data = JSON.parse(data);
        var uploadResult = data.uploadResult;
        var generalResult = data.generalResult.transformationResults.results;

        reply.view('02-send-your-data/02-verify-your-file', {
          returnMetaData: {fileKey: uploadResult.fileKey,
            eaId: generalResult.Result_EA_ID.value,
            siteName: generalResult.Result_Site_Name.value,
            returnType: generalResult.Result_Rtn_Type.value
          }
        });
      });
  },
  /*
   * HTTP POST Handler for the /02-send-your-data/02-verify-your-file route
   * @Param request
   * @param reply
   * Redirects the current page
   */
  postHandler: function (request, reply) {
    reply.redirect('/02-send-your-data/06-failure');
  }
};

