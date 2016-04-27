
var SMTPHandler = require('../lib/smtp-handler');
var PinHandler = require('../lib/pin-handler');
var userHandler = require('../lib/user-handler');
var CacheHandler = require('../lib/cache-handler');
var Utils = require('../lib/utils');
var ErrorHandler = require('../lib/error-handler');

module.exports = {
  /*
   * HTTP GET handler for /02-send-your-data/03-confirm-your-email-address
   * @param {type} request
   * @param {type} reply
   * @returns {undefined}
   */
  getHandler: function (request, reply) {

    var sessionID = Utils.base64Decode(request.state['data-returns-id']);
    var filekey = sessionID + '_SourceName';



    userHandler.isAuthenticated(sessionID)
      .then(function (result) {
        CacheHandler.getValue(filekey)
          .then(function (fileName) {
            fileName = fileName ? fileName.replace(/"/g, '') : '';

            if (result === true) {
              reply.view('02-send-your-data/05-send-your-file', {
                fileName: fileName
              });
            } else {
              reply.view('02-send-your-data/03-confirm-your-email-address', {
                fileName: fileName
              });
            }
          })
          .catch(function (err) {
            console.error(err);
          });
      })
      .catch(function () {
        reply.view('02-send-your-data/03-confirm-your-email-address', {
          returnMetaData: request.session.get('returnMetaData')
        });
      });

  },
  /*
   * HTTP Post Handler for /02-send-your-data/03-confirm-your-email-address
   * @param {type} request
   * @param {type} reply
   * @returns {undefined}
   */
  postHandler: function (request, reply) {
    /* get the users email address */
    var usermail = request.payload['user_email'];
    var sessionID = Utils.base64Decode(request.state['data-returns-id']);
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

              userHandler.setUser(sessionID, user)
                .then(function () {
                  SMTPHandler.sendPinEmail(usermail, newpin);
                })
                .then(function () {
                  reply.redirect('/02-send-your-data/04-enter-your-code',
                    {
                      emailAddress: usermail
                    });
                });
            });
        }

      })
      .catch(function (errResult) {
        reply.view('02-send-your-data/03-confirm-your-email-address', {
          invalidEmailAddress: true,
          invalidEmailAddressErrorMessage: ErrorHandler.render(errResult.errorCode, null, 'Invalid email address'),
          errorcode: 'DR' + errResult.errorCode
        });
      });
  }
};