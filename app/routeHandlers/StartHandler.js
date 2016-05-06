

var HelpLinks = require('../config/dep-help-links');


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
      HowToFormatEnvironmentAgencyData: HelpLinks.links.HowToFormatEnvironmentAgencyData,
      EnvironmentalPermittingLandfillSectorTechnicalGuidance: HelpLinks.links.EnvironmentalPermittingLandfillSectorTechnicalGuidance,
      CreateAndSaveCSVFile: HelpLinks.links.CreateAndSaveCSVFile,
      ScottishLink: HelpLinks.links.ScottishLink,
      WelshLink: HelpLinks.links.WelshLink,
      NorthernIrelandLink: HelpLinks.links.NorthernIrelandLink
    }).unstate('data-returns-id').state('data-returns-id', null, cookieOptions);
  }
};

