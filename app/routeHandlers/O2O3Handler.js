
var SMTPHandler = require('../lib/smtp-handler');
var PinHandler = require('../lib/pin-handler');
var userHandler = require('../lib/user-handler');

module.exports = {
  /*
   * HTTP GET handler for /02-send-your-data/03-email
   * @param {type} request
   * @param {type} reply
   * @returns {undefined}
   */
  getHandler: function (request, reply) {

    var sessionID = 'id_' + request.session.id;

    userHandler.isAuthenticated(sessionID)
      .then(function (result) {
        if (result === true) {
          reply.view('02-send-your-data/05-success', {
            returnMetaData: request.session.get('returnMetaData')
          });
        } else {
          reply.view('02-send-your-data/03-email', {
            returnMetaData: request.session.get('returnMetaData')
          });
        }

      })
      .catch(function (result) {
        reply.view('02-send-your-data/03-email', {
          returnMetaData: request.session.get('returnMetaData')
        });
      });

  },
  /*
   * HTTP Post Handler for /02-send-your-data/03-email
   * @param {type} request
   * @param {type} reply
   * @returns {undefined}
   */
  postHandler: function (request, reply) {
    /* get the users email address */
    var usermail = request.payload['user_email'];
    usermail = usermail.trim();
    /* Validate the email address */
    SMTPHandler.validateEmailAddress(usermail)
      .then(function (result) {
        if (result === true) {
          /* Get a new pin code */
          PinHandler.newPin()
            .then(function (newpin) {
              /* Store in REDIS */
              var datenow = new Date();

              var user = {
                authenticated: false,
                email: usermail,
                pin: newpin,
                pinCreationTime: datenow.toUTCString(),
                uploadCount: 0
              };

              userHandler.setUser('id_' + request.session.id, user)
                .then(function (result) {
                  SMTPHandler.sendPinEmail(usermail, newpin);
                })
                .then(function (result) {
                  reply.redirect('/02-send-your-data/04-authenticate');
                });
            });
        }

      })
      .catch(function (errResult) {
        if (errResult.invalidEmailAddress === true) {
          reply.view('02-send-your-data/03-email', {
            returnMetaData: request.session.get('returnMetaData'),
            invalidEmailAddress: true
          });
        }
      });
  }
};