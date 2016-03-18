

var HelpLinks = require('../config/dep-help-links');


//path: '/01-start/01-start',


module.exports = {
  /*
   *  HTTP POST handler for '/01-start/01-start' route
   *  @Param request
   *  @Param reply
   */
  postHandler: function (request, reply) {

    // clear session data
    //TODO remove session references once sticky sessions are removed
    request.session.reset();

    reply.redirect('/02-send-your-data/01-choose-your-file');

  },
  /*
   * get handler for '/01-start/01-start' route
   */
  getHandler: function (request, reply) {
    
    var cookieOptions = {
    path:'/',
    ttl: null,
    isSecure: false,
    isHttpOnly: true,
    encoding: 'none', //base64json',
    clearInvalid: false,
    strictHeader: true
  };
  
    reply.view('01-start/01-start', {
      HowToFormatEnvironmentAgencyData: HelpLinks.links.HowToFormatEnvironmentAgencyData,
      EnvironmentalPermittingLandfillSectorTechnicalGuidance: HelpLinks.links.EnvironmentalPermittingLandfillSectorTechnicalGuidance
    }).unstate('data-returns-id').state('data-returns-id', null, cookieOptions);


  }
};

