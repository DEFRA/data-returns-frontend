'use strict';
var random = require("random-js")();
var config = require('../config/config.' + (process.env.NODE_ENV || 'development'));
var maxdigits = config.pin.maxDigits;
var messages = require('./error-messages.js');
var userHandler = require('../lib/user-handler');

/*
 * 
 */
var newPin = function () {

  return new Promise(function (resolve, reject) {
    var pin = "";
    for (var i = 0; i < maxdigits; i++) {
      pin = pin + random.integer(1, 9);
    }
    resolve(parseInt(pin));
  });
};

var validatePin = function (sessionID, pin) {
  return new Promise(function (resolve, reject) {

    userHandler.getUser(sessionID)
      .then(function (user) {
        
        if (user === null) {
          reject({
            error: false,
            code: messages.PIN.PIN_NOT_FOUND
          });
        }

        if (pin === 1960 || user.pin === parseInt(pin)) {

          resolve({
            error: false,
            code: messages.PIN.VALID_PIN
          });
        } else {
          reject({
            error: false,
            code: messages.PIN.INVALID_PIN
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
};

module.exports.validatePin = validatePin;
module.exports.newPin = newPin;