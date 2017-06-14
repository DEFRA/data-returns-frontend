"use strict";

const winston = require("winston");
const config = require('../lib/configuration-handler.js').Configuration;
const moment = require('moment');
const uuid = require('uuid');
const cacheHandler = require('./cache-handler');
const cryptoHandler = require('./crypto-handler');
const redisKeys = require('./redis-keys');
const DATA_RETURNS_COOKIE_ID = "data-returns-id";

/*
 * Saves a user object JSON to Redis
 * @param sessionID the session id used as the key
 * @param user the JSON object representing a user object
 */
let setUser = function (sessionID, user) {
    return redisKeys.USER_DATA.compositeKey(sessionID)
        .then((redisKey) => {
            user.last_updated = new Date().toUTCString();
            return cacheHandler.setValue(redisKey, user);
        });
};

/*
 * gets a user from Redis based on a key
 * @param sessionID used as the key
 */
let getUser = function (sessionID) {
    return redisKeys.USER_DATA.compositeKey(sessionID).then(cacheHandler.getJsonValue);
};

module.exports.getUserMail = function (sessionID) {
    return getUser(sessionID)
        .then(function (user) {
            if (user && user.email) {
                return user.email;
            } else {
                return Promise.reject(new Error('Email address not set'));
            }
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
                        let mins = moment().diff(pinCreationTime, 'minutes');
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


module.exports.modifyUser = function (sessionID, modifyHandler) {
    return new Promise(
        function (resolve, reject) {
            getUser(sessionID).then(function (user) {
                user = user || {};
                modifyHandler(user);
                return setUser(sessionID, user);
            }).then(resolve).catch((err) => {
                winston.error(err);
                reject(err);
            });
        });
};

/**
 *
 * Determine if the user has uploaded files in this session.
 *
 * @param sessionID the user's session ID
 * @returns {*|Promise} resolved with boolean true if there are uploads, false otherwise.  rejected on error
 */
module.exports.hasUploads = function (sessionID) {
    return redisKeys.UPLOADED_FILES.compositeKey(sessionID).then(cacheHandler.arrayNotEmpty);
};
/**
 * Retrieve an array of files that the user has uploaded
 *
 * @param sessionID the user's session ID
 * @returns {*|Promise} resolved with an array of uploaded file information if present, rejected otherwise
 */
module.exports.getUploads = function (sessionID) {
    return redisKeys.UPLOADED_FILES.compositeKey(sessionID).then(cacheHandler.arrayGet);
};

module.exports.getSessionID = function (request) {
    return request.state[DATA_RETURNS_COOKIE_ID];
};

module.exports.emptyUploadList = function (currentSessionId) {
    return redisKeys.UPLOADED_FILES.compositeKey(currentSessionId)
        .then((keyPattern) => {
            winston.debug(`Removing upload list keys for pattern ${keyPattern}`);
            return cacheHandler.deleteKeys(keyPattern);
        });
};

module.exports.removeUpload = function (sessionID, uploadData) {
    redisKeys.UPLOADED_FILES.compositeKey(sessionID).then((redisKey) => cacheHandler.arrayRemove(redisKey, uploadData));
};


module.exports.newSession = function (request, reply, sessionKey) {
    return new Promise(function (resolve, reject) {
        // Generate new session
        let newSessionId = sessionKey || uuid.v4();

        // Set up cookie details
        var cookieOptions = {
            "path": '/',
            "ttl": 24 * 60 * 60 * 1000,
            //"ttl": null,
            "isSecure": config.get('session.secure'),
            "isHttpOnly": true,
            "encoding": "none", //base64json',
            "ignoreErrors": false,
            "clearInvalid": false,
            "strictHeader": true
        };

        // Add a new CSRF token to the session
        let token = cryptoHandler.generateCSRFToken();

        // Set the session cookie in the reply state
        winston.debug(`Set a new session cookie: ${newSessionId} `);
        reply.state(DATA_RETURNS_COOKIE_ID, newSessionId, cookieOptions);

        // Set the session here for because otherwise it is not retrievable in the preResponse
        request._sessionId = newSessionId;

        winston.debug(`Adding a new CSRF token to the cache for session: ${newSessionId}`);
        redisKeys.CSRF_TOKEN.compositeKey(newSessionId)
            .then((redisKey) => cacheHandler.setValue(redisKey, token))
            .then(() => winston.debug(`New CSRF token is added for session: ${newSessionId}`))
            .then(resolve)
            .catch(reject);
    });
};

module.exports.deleteSession = function (request, reply) {
    return new Promise(
        function (resolve, reject) {
            // Cleanup current session from the redis cache and unset the cookie
            let currentSessionId = request.state[DATA_RETURNS_COOKIE_ID];
            if (currentSessionId) {
                let keyPattern = `${currentSessionId}*`;
                winston.debug(`Removing keys in cache for pattern ${keyPattern}`);
                cacheHandler.deleteKeys(keyPattern)
                    .then(keys => {
                        reply.unstate(DATA_RETURNS_COOKIE_ID);
                        winston.debug(`Removed keys ${keys} from cache`);
                    })
                    .then(resolve)
                    .catch(reject);
            } else {
                winston.debug('No session found in cache for which to remove keys');
                resolve();
            }
        });
};

module.exports.newUserSession = function (request, reply, sessionKey) {
    return new Promise(
        function (resolve, reject) {
            winston.debug('New session...');
            module.exports.deleteSession(request, reply)
                .then(() => module.exports.newSession(request, reply, sessionKey))
                .then(resolve)
                .catch(reject);
        });
};

module.exports.getUser = getUser;
module.exports.setUser = setUser;

module.exports.DATA_RETURNS_COOKIE_ID = DATA_RETURNS_COOKIE_ID;