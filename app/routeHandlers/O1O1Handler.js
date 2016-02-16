

var HelpLinks = require('../config/dep-help-links');
var userHandler = require('../lib/user-handler');
//path: '/01-start/01-start',


module.exports = {
  /*
   *  HTTP POST handler for '/01-start/01-start' route
   *  @Param request
   *  @Param reply
   */
  postHandler: function (request, reply) {

    var sessionID = 'id_' + request.session.id;
    // clear session data
    request.session.reset();
    // seed user data
    var user = {
      authenticated: false,
      email: '',
      pin: '',
      filekey: '',
      uploadCount: 0
    };

    //session id will have changed after the reset
    sessionID = 'id_' + request.session.id;

    userHandler.setUser(sessionID, user)
      .then(function () {
        reply.redirect('/02-send-your-data/01-upload-your-data');
      });

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

