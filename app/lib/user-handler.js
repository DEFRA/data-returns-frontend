var config = require('../config/configuration_' + (process.env.NODE_ENV || 'local'));
var cacheHandler = require('./cache-handler');
var utils = require('./utils');
const errbit = require("./errbit-handler");

/*
 * Saves a user object JSON to Redis
 * @param sessionID the session id used as the key
 * @param user the JSON object representing a user object
 */
var setUser = function (sessionID, user) {

    return new Promise(function (resolve, reject) {
        user.last_updated = new Date().toUTCString();

        cacheHandler.setValue(sessionID, user)
            .then(function (result) {
                resolve(result);
            })
            .catch(function (errResult) {
                reject(errResult);
            });
    });
};

/*
 * gets a user from Redis based on a key
 * @param sessionID used as the key
 */
var getUser = function (sessionID) {

    return new Promise(function (resolve, reject) {
        cacheHandler.getValue(sessionID)
            .then(function (result) {

                result = JSON.parse(result) || null;
                resolve(result);

            })
            .catch(function (err) {
                errbit.notify(err);
                reject('errResult');
            });
    });
};

module.exports.doesExists = function (sessionID) {
    console.log('==> userHandler doesExist()');
    getUser(sessionID)
        .then(function (result) {
            return (result !== null) ? true : false;
        })
        .catch(function (err) {
            errbit.notify(err);
            return false;
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
                var autenticated = true;

                if (user === null) {
                    autenticated = false;
                } else {

                    // Pin validation
                    if (user.authenticated !== true) {
                        autenticated = false;
                    }
                    // Max no of uses per pin
                    if (user.uploadCount >= config.pin.MaxUploadsPerPin) {
                        autenticated = false;
                    }
                    // Is the pin in date
                    if (user.pinCreationTime) {
                        var pinCreationTime = new Date(user.pinCreationTime);
                        var dateNow = new Date();
                        var mins = utils.getMinutesBetweenDates(pinCreationTime, dateNow);

                        if (mins > config.pin.ValidTimePeriodMinutes) {
                            autenticated = false;
                        }
                    }
                }

                resolve(autenticated);

            })
            .catch(function (err) {
                reject(err);
            });
    });
};

module.exports.setIsAuthenticated = function (sessionID, value) {
    console.log('==> setIsAuthenticated() ', value, sessionID);
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

module.exports.getNewUserID = function () {
    var ret = utils.getNewUUID();
    return ret;//'id' + ret.replace(/"/g, "");
};

module.exports.getUser = getUser;
module.exports.setUser = setUser;