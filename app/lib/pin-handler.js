/*
 * 
 * Module to handle pin generation and validation
 * 
 */

/* global process */

'use strict';
const winston = require("winston");
const config = require('../lib/configuration-handler.js').Configuration;
const utils = require('../lib/utils.js');

var random = require('random-js')();
var messages = require('./error-messages.js');
var userHandler = require('./user-handler');
var cacheHandler = require('./cache-handler');

var checkInvalidPinCount = function (sessionID) {

    return new Promise(function (resolve, reject) {
        var key = sessionID + '-invalid-pin-count';

        cacheHandler.getValue(key)
            .then(function (result) {
                if (result) {
                    result = parseInt(result);

                    var maxretries = utils.isInt(config.get('pin.maxretries')) ? config.get('pin.maxretries') : 10;

                    if (result > maxretries) {
                        //reset the count
                        cacheHandler.setValue(key, 1);
                        // display error message
                        reject();
                    } else {
                        cacheHandler.setValue(key, result + 1);
                        resolve();
                    }
                } else {
                    cacheHandler.setValue(key, 1);
                    resolve();
                }
            });
    });
};


module.exports = {
    /*
     * Creates a new pin number
     */
    newPin: function () {
        return new Promise(function (resolve, reject) {
            winston.info('==> newPin()');
            var maxdigits = utils.isInt(config.get('pin.maxDigits')) ? config.get('pin.maxDigits') : 4;
            var pin = '';

            try {
                for (var i = 0; i < maxdigits; i++) {
                    pin = pin + random.integer(1, 9);
                }
                resolve(parseInt(pin));
            } catch (err) {
                winston.error(err);
                reject();
            }
        });
    },
    /*
     * Validates a pin number
     */
    validatePin: function (sessionID, pin) {
        return new Promise(function (resolve, reject) {
            winston.info('==> validatePin()');

            checkInvalidPinCount(sessionID)
                .then(function () {
                    userHandler.getUser(sessionID)
                        .then(function (user) {

                            if (user === null) {
                                reject({
                                    error: false,
                                    code: 2225
                                });
                            }

                            if (pin === config.get('pin.defaultPin') || user.pin === parseInt(pin)) {
                                winston.info('\t pin is valid');
                                resolve({
                                    error: false,
                                    code: messages.PIN.VALID_PIN
                                });
                            } else {

                                var code = 2225; //Invalid
                                // Is the pin in date
                                if (user.pinCreationTime) {
                                    var pinCreationTime = new Date(user.pinCreationTime);
                                    var dateNow = new Date();
                                    var mins = utils.getMinutesBetweenDates(pinCreationTime, dateNow);

                                    if (mins > config.get('pin.ValidTimePeriodMinutes')) {
                                        code = 2275; //Expired
                                    }
                                }

                                winston.info('\t pin is invalid');
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
                })
                .catch(function () {
                    // too many pin code attempts
                    reject({
                        error: false,
                        code: 2280
                    });
                });
        });
    }
};

