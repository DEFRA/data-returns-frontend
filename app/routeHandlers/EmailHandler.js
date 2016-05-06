
var SMTPHandler = require('../lib/smtp-handler');
var PinHandler = require('../lib/pin-handler');
var userHandler = require('../lib/user-handler');
var CacheHandler = require('../lib/cache-handler');
var Utils = require('../lib/utils');
var ErrorHandler = require('../lib/error-handler');

module.exports = {
  /*
   * HTTP GET handler for /email
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
              reply.view('data-returns/send-your-file', {
                fileName: fileName
              });
            } else {
              reply.view('data-returns/confirm-your-email-address', {
                fileName: fileName,
                invalidEmailAddress: false,
                showStartAgainButton: false,
                showSendMailButton: true,
                showInput: 'true'
              });
            }
          })
          .catch(function (err) {
            console.error(err);
          });
      })
      .catch(function () {
        reply.view('data-returns/confirm-your-email-address', {
          returnMetaData: request.session.get('returnMetaData')
        });
      });

  },
  /*
   * HTTP Post Handler for /email
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
                  reply.redirect('/pin',
                    {
                      emailAddress: usermail
                    });
                });
            });
        }

      })
      .catch(function (errResult) {
        reply.view('data-returns/confirm-your-email-address', {
          invalidEmailAddress: true,
          showStartAgainButton: errResult.errorCode === 2055 ? true : false,
          showInput: errResult.errorCode === 2055 ? false : true,
          showSendMailButton: errResult.errorCode === 2055 ? false : true,
          invalidEmailAddressErrorMessage: ErrorHandler.render(errResult.errorCode, null, 'Invalid email address'),
          errorcode: 'DR' + errResult.errorCode
        });
      });
  }
};