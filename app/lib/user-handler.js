"use strict";

const winston = require("winston");
const config = require('../lib/configuration-handler.js').Configuration;

var cacheHandler = require('./cache-handler');
var cryptoHandler = require('./crypto-handler');
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
/**
 *
 * Determine if the user has uploaded files in this session.
 *
 * @param sessionID the user's session ID
 * @returns {*|Promise} resolved with the number of uploads if there are any, rejected otherwise
 */
module.exports.hasUploads = function (sessionID) {
    let uploadsKey = redisKeys.UPLOADED_FILES.compositeKey(sessionID);
    return cacheHandler.arrayNotEmpty(uploadsKey);
};
/**
 * Retrieve an array of files that the user has uploaded
 *
 * @param sessionID the user's session ID
 * @returns {*|Promise} resolved with an array of uploaded file information if present, rejected otherwise
 */
module.exports.getUploads = function (sessionID) {
    let uploadsKey = redisKeys.UPLOADED_FILES.compositeKey(sessionID);
    return cacheHandler.arrayGet(uploadsKey);
};

module.exports.getSessionID = function (request) {
    return request.state[DATA_RETURNS_COOKIE_ID];
};

module.exports.emptyUploadList = function (currentSessionId) {
    return new Promise(function (resolve, reject) {
        // Cleanup current session
        let keyPattern = `${redisKeys.UPLOADED_FILES.compositeKey(currentSessionId)}*`;
        winston.info(`Removing upload list keys for pattern ${keyPattern}...`);

        cacheHandler.deleteKeys(keyPattern)
            .then(function() {
                winston.debug(`Completed removing upload list keys for pattern ${keyPattern}`);
                resolve();
            })
            .catch(function(err) {
                winston(err);
                reject();
            });
    });
};

module.exports.deleteSession = function (request, reply) {
    return new Promise(function (resolve, reject) {
        // Cleanup current session from the redis cache and unset the cookie
        let currentSessionId = request.state[DATA_RETURNS_COOKIE_ID];
        if (currentSessionId) {

            let keyPattern = `${currentSessionId}*`;
            winston.info(`Removing redis keys for pattern ${keyPattern}`);

            return cacheHandler.deleteKeys(keyPattern)
                .then(keys => {
                    winston.info(`Successfully removed keys ${keys} from redis`);
                    reply.unstate(DATA_RETURNS_COOKIE_ID);
                    return resolve();
                })
                .catch(err => {
                    winston.error(err);
                    return reject();
                });

        } else {
            winston.debug('No session found for which to remove keys from redis');
            resolve();
        }
    });
};

module.exports.newSession = function (request, reply, sessionKey) {
    return new Promise(function (resolve, reject) {
        // Generate new session
        let newSessionId = sessionKey || utils.getNewUUID();

        // Set up cookie details
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

        // Add a new CSRF token to the session
        let token = cryptoHandler.generateCSRFToken();

        // Set the session cookie in the reply state
        winston.info(`Set a new session cookie: ${newSessionId} `);
        reply.state(DATA_RETURNS_COOKIE_ID, newSessionId, cookieOptions);

        // Set the session here for because otherwise it is not retrievable in the preResponse
        request._sessionId = newSessionId;

        // Set the CSRF token for the session in redis
        return cacheHandler.setValue(redisKeys.CSRF_TOKEN.compositeKey(newSessionId), token).then(function () {
            winston.debug(`Set CSRF token in session: ${newSessionId} `);
            return resolve();
        }).catch(function () {
            winston.error(`Unable to set CSRF token on session: ${newSessionId}`);
            return reject();
        });
    });
};

module.exports.newUserSession = function (request, reply, sessionKey) {
    this.deleteSession(request, reply)
        .then(() => {
            return this.newSession(request, reply, sessionKey);
        })
        .catch(err => winston.error(err));

};

module.exports.getUser = getUser;
module.exports.setUser = setUser;

module.exports.DATA_RETURNS_COOKIE_ID = DATA_RETURNS_COOKIE_ID;