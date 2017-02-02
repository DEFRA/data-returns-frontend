'use strict';
const winston = require("winston");
const moment = require('moment');
const config = require('../lib/configuration-handler.js').Configuration;
const random = require('random-js')();
const userHandler = require('./user-handler');
const cacheHandler = require('./cache-handler');
const MAX_PIN_ATTEMPTS = Number.isInteger(config.get('pin.maxretries')) ? config.get('pin.maxretries') : 10;
const PIN_LENGTH = Number.isInteger(config.get('pin.maxDigits')) ? config.get('pin.maxDigits') : 4;

/**
 * Check if a session is locked out due to exceeding the allowed pin entry attempts
 *
 * @returns {Promise}
 */
let incrementAndCheckLock = function (sessionID) {
    return new Promise(function (resolve, reject) {
        let key = sessionID + '-invalid-pin-count';

        cacheHandler.increment(key).then((attempts) => {
            resolve({
                locked: attempts > MAX_PIN_ATTEMPTS,
                attempts: attempts
            });
        }).catch(reject);
    });
};


module.exports = {
    /**
     * Check if a session is locked out due to exceeding the allowed pin entry attempts
     *
     * @returns {Promise}
     */
    checkLock: function (sessionID) {
        return new Promise(function (resolve, reject) {
            let key = sessionID + '-invalid-pin-count';
            cacheHandler.getValue(key).then((attempts) => {
                if (!attempts) {
                    attempts = 0;
                }
                resolve({
                    locked: attempts > MAX_PIN_ATTEMPTS,
                    attempts: attempts
                });
            }).catch(reject);
        });
    },
    /*
     * Creates a new pin number
     */
    newPin: function () {
        return new Promise(function (resolve, reject) {
            try {
                resolve(random.string(PIN_LENGTH, '0123456789'));
            } catch (err) {
                winston.error(err);
                reject(err);
            }
        });
    },
    /*
     * Validates a pin number
     */
    validatePin: function (sessionID, pin) {
        return new Promise(function (resolve, reject) {
            winston.info('==> validatePin()');
            let response = {valid: false, locked: false, expired: false};

            incrementAndCheckLock(sessionID)
                .then((status) => response.locked = status.locked)
                .then(() => userHandler.getUser(sessionID))
                .then((user) => {
                    response.valid = pin === `${config.get('pin.defaultPin')}` || user.pin === pin;
                    if (!response.valid && user.pinCreationTime) {
                        let pinCreationTime = new Date(user.pinCreationTime);
                        let mins = moment().diff(pinCreationTime, 'minutes');
                        response.expired = mins > config.get('pin.ValidTimePeriodMinutes');
                    }
                    winston.debug(`PIN Validation Response: ${JSON.stringify(response)}`);
                    resolve(response);
                })
                .catch(reject);
        });
    }
};