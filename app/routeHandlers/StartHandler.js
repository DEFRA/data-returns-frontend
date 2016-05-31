

var helpLinks = require('../config/dep-help-links');
//path: '/start',


module.exports = {
  /*
   *  HTTP POST handler for '/start' route
   *  @Param request
   *  @Param reply
   */
  postHandler: function (request, reply) {

    reply.redirect('/file/choose');
  },
  /*
   * get handler for '/start' route
   */
  getHandler: function (request, reply) {

    var cookieOptions = {
      path: '/',
      ttl: null,
      isSecure: false,
      isHttpOnly: true,
      encoding: 'none', //base64json',
      clearInvalid: false,
      strictHeader: true
    };
    
    reply.view('data-returns/start', {
      HowToFormatEnvironmentAgencyData: helpLinks.links.HowToFormatEnvironmentAgencyData,
      EnvironmentalPermittingLandfillSectorTechnicalGuidance: helpLinks.links.EnvironmentalPermittingLandfillSectorTechnicalGuidance,
      CreateAndSaveCSVFile: helpLinks.links.CreateAndSaveCSVFile,
      ScottishLink: helpLinks.links.ScottishLink,
      WelshLink: helpLinks.links.WelshLink,
      NorthernIrelandLink: helpLinks.links.NorthernIrelandLink
    }).unstate('data-returns-id').state('data-returns-id', null, cookieOptions);
  }
};

