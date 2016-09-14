"use strict";

const winston = require("winston");
const config = require('../lib/configuration-handler.js').Configuration;

var cacheHandler = require('./cache-handler');
const redisKeys = require('./redis-keys');
var utils = require('./utils');
const DATA_RETURNS_COOKIE_ID = "data-returns-id";

/*
 * Saves a user object JSON to Redis
 * @param sessionID the session id used as the key
 * @param user the JSON object representing a user object
 */
var setUser = function (sessionID, user) {
    return new Promise(function (resolve, reject) {
        user.last_updated = new Date().toUTCString();
        cacheHandler.setValue(redisKeys.USER_DATA.compositeKey(sessionID), user)
            .then(resolve).catch(reject);
    });
};

/*
 * gets a user from Redis based on a key
 * @param sessionID used as the key
 */
var getUser = function (sessionID) {
    return new Promise(function (resolve, reject) {
        cacheHandler.getJsonValue(redisKeys.USER_DATA.compositeKey(sessionID))
            .then(resolve).catch(reject);
    });
};

module.exports.getUserMail = function (sessionID) {
    return new Promise(function (resolve, reject) {
        getUser(sessionID)
            .then(function (user) {
                if (user && user.email) {
                    resolve(user.email);
                } else {
                    reject(false);
                }
            })
            .catch(function () {
                reject(false);
            });
    });
};

module.exports.isAuthenticated = function (sessionID) {

    return new Promise(function (resolve, reject) {
        getUser(sessionID)
            .then(function (user) {
                var authenticated = false;

                if (user !== null) {
                    // Pin validation
                    authenticated = user.authenticated === true;

                    // Max no of uses per pin
                    if (user.uploadCount >= config.get('pin.MaxUploadsPerPin')) {
                        authenticated = false;
                    }
                    // Is the pin in date
                    if (user.pinCreationTime) {
                        var pinCreationTime = new Date(user.pinCreationTime);
                        var dateNow = new Date();
                        var mins = utils.getMinutesBetweenDates(pinCreationTime, dateNow);

                        if (mins > config.get('pin.ValidTimePeriodMinutes')) {
                            authenticated = false;
                        }
                    }
                }

                resolve(authenticated);
            })
            .catch(reject);
    });
};

module.exports.setIsAuthenticated = function (sessionID, value) {
    winston.info('==> setIsAuthenticated() ', value, sessionID);
    getUser(sessionID)
        .then(function (user) {
            user.authenticated = value;
            setUser(sessionID, user);
        });
};

module.exports.incrementUploadCount = function (sessionID) {
    getUser(sessionID)
        .then(function (user) {
            if (user !== null) {
                user.uploadCount++;
                setUser(sessionID, user);
            }
        });
};

module.exports.getSessionID = function(request) {
    return request.state[DATA_RETURNS_COOKIE_ID];
};
module.exports.deleteSession = function(request, reply) {
    // Cleanup current session
    let currentSessionId = this.getSessionID(request, reply);
    let keyPattern = `${currentSessionId}*`;
    winston.info(`Removing redis keys for pattern ${keyPattern}`);
    cacheHandler.deleteKeys(keyPattern);
    reply.unstate(DATA_RETURNS_COOKIE_ID);
};

module.exports.newUserSession = function(request, reply) {
    // Cleanup current session
    this.deleteSession(request, reply);

    // Generate new session
    let newSessionId = utils.getNewUUID();
    var cookieOptions = {
        "path": '/',
        "ttl": 24 * 60 * 60 * 1000,
        //"ttl": null,
        "isSecure": false,
        "isHttpOnly": true,
        "encoding": "none", //base64json',
        "ignoreErrors": false,
        "clearInvalid": false,
        "strictHeader": true
    };
    reply.state(DATA_RETURNS_COOKIE_ID, newSessionId, cookieOptions);
};
module.exports.getUser = getUser;
module.exports.setUser = setUser;