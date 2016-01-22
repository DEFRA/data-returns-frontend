var config = require('../config/configuration_' + (process.env.NODE_ENV || 'local'));
var cacheHandler = require('./cache-handler');
var Utils = require('./utils');

/*
 * Saves a user object JSON to Redis
 * @param sessionID the session id used as the key
 * @param user the JSON object representing a user object
 */
var setUser = function (sessionID, user) {

  return new Promise(function (resolve, reject) {

    var datenow = new Date();
    user.last_updated = datenow.toUTCString();

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

        result = JSON.parse(result);
        resolve(result);

      })
      .catch(function (errResult) {
        //TODO decide what to do
      });
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
/*var user = {
 authenticated: false,
 email: usermail,
 pin: newpin,
 filekey:''
 };*/



module.exports.isAuthenticated = function (sessionID) {

  return new Promise(function (resolve, reject) {
    getUser(sessionID)
      .then(function (user) {
        var isValid = true;
        // Pin validation
        if (user.authenticated !== true) {
          isValid = false;
        }
        // Max no of uses per pin
        if (user.uploadCount > config.pin.MaxUploadsPerPin) {
          isValid = false;
        }
        // Is the pin in date 
        if (user.pinCreationTime) {
          var pinCreationTime = new Date(user.pinCreationTime);
          var dateNow = new Date();
          var mins = Utils.getMinutesBetweenDates(pinCreationTime, dateNow);

          if (mins > config.pin.ValidTimePeriodMinutes) {
            isValid = false;
          }
        }

        resolve(isValid);

      })
      .catch(function (err) {
        reject(err);
      });
  });
};

module.exports.setIsAuthenticated = function (sessionID, value) {

  getUser(sessionID)
    .then(function (user) {
      user.authenticated = value;
      setUser(sessionID, user);
    });
};

module.exports.incrementUploadCount = function (sessionID) {
  getUser(sessionID)
    .then(function (user) {
      user.uploadCount = user.uploadCount + 1;
      setUser(sessionID, user);
    });
};



module.exports.getUser = getUser;
module.exports.setUser = setUser;