/*
 * 
 * Module to handle pin generation and validation
 * 
 */

'use strict';
var random = require("random-js")();
var config = require('../config/configuration_' + (process.env.NODE_ENV || 'local'));
var maxdigits = config.pin.maxDigits;
var messages = require('./error-messages.js');
var userHandler = require('../lib/user-handler');
var Utils = require('../lib/utils');

module.exports = {
  /*
   * Creates a new pin number
   */
  newPin: function () {
    return new Promise(function (resolve, reject) {
      console.log('==> newPin()');
      var pin = "";
      for (var i = 0; i < maxdigits; i++) {
        pin = pin + random.integer(1, 9);
      }
      resolve(parseInt(pin));
    });
  },
  /*
   * Validates a pin number
   */
  validatePin: function (sessionID, pin) {
    return new Promise(function (resolve, reject) {
      console.log('==> validatePin()');
      userHandler.getUser(sessionID)
        .then(function (user) {

          if (user === null) {
            reject({
              error: false,
              code: 2225
            });
          }

          if (pin === config.pin.defaultPin || user.pin === parseInt(pin)) {
            console.log('\t pin is valid');
            resolve({
              error: false,
              code: messages.PIN.VALID_PIN
            });
          } else {
            var code = 2225;
            // Is the pin in date 
            if (user.pinCreationTime) {
              var pinCreationTime = new Date(user.pinCreationTime);
              var dateNow = new Date();
              var mins = Utils.getMinutesBetweenDates(pinCreationTime, dateNow);

              if (mins > config.pin.ValidTimePeriodMinutes) {
                code = 2275;
              }
            }

            console.log('\t pin is invalid');
            reject({
              error: false,
              code: code
            });

          }
        })
        .catch(function (errResult) {
          reject({
            error: true,
            code: errResult
          });
        });
    });
  }
};

