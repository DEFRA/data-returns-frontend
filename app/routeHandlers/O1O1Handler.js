

var HelpLinks = require('../config/dep-help-links');
var UserHandler = require('../lib/user-handler');
var Utils = require('../lib/utils');
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

    reply.redirect('/02-send-your-data/01-upload-your-data');

  },
  /*
   * get handler for '/01-start/01-start' route
   */
  getHandler: function (request, reply) {
    reply.view('01-start/01-start', {
      HowToFormatEnvironmentAgencyData: HelpLinks.links.HowToFormatEnvironmentAgencyData,
      EnvironmentalPermittingLandfillSectorTechnicalGuidance: HelpLinks.links.EnvironmentalPermittingLandfillSectorTechnicalGuidance
    });
  }
};

