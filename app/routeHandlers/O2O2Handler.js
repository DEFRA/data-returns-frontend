
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
    console.log('==> O2O2Handler getHandler() ');
    CacheHandler.getValue(key)
      .then(function (data) {
        var parsedData = JSON.parse(data);
        var uploadResult = parsedData.uploadResult;
        var generalResult = parsedData.generalResult.transformationResults.results;

        var metaData = {
          fileKey: uploadResult.fileKey,
          eaId: generalResult.Result_EA_ID.value,
          siteName: generalResult.Result_Site_Name.value,
          returnType: generalResult.Result_Rtn_Type.value
        };

        console.log('\t metadata: ', metaData);

        reply.view('02-send-your-data/02-verify-your-file', {
          returnMetaData: metaData
        });

        console.log('<== O2O2Handler getHandler()');

      })
      .catch(function (err) {
        console.log('<== O2O2Handler getHandler() Error' + err);
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

