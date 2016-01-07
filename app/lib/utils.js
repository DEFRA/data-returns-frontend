'use strict';
var FileSystem = require('fs');
var CacheHandler = require('./cache-handler');

module.exports = {
  /**
   * Renames a file asynchronously using a promise.
   * @param oldPath The full path to the file to rename.
   * @param newPath The full path to the new name of the file.
   * @returns {Promise} A promise which is fulfilled (with Boolean true)
   *   when the file has been renamed, or is rejected upon an error.
   */
  renameFile: function (oldPath, newPath) {
    return new Promise(function (resolve, reject) {
      FileSystem.rename(oldPath, newPath, function (err) {
        if (err === null) {
          resolve(true);
        } else {
          reject(err);
        }
      });
    });
  },
  /**
   * Returns the best possible message text for an error object returned by
   * one of the library modules in this project.  This message is intended
   * for a log only; not for display to the user.
   * @param errorData Error information returned by one of the methods in
   *   a library module from this project.
   * @returns {string} A string describing the error.
   */
  getBestLogMessageFromError: function (errorData) {
    var msg = '"errorData" object was null; no details available.';
    if (errorData !== null) {
      if ('err' in errorData) {
        msg = errorData.err.toString();
      } else if ('message' in errorData) {
        msg = errorData.message.toString();
      } else if (('apiErrors' in errorData) && (errorData.apiErrors.length > 0)) {
        if ('reason' in errorData.apiErrors[0]) {
          msg = errorData.apiErrors[0].reason;
        }
      }
    }
    return msg;
  },
  /*
   * Calculates the number of minutes between 2 dates
   * @param {Date} startDate
   * @param {Date} endDate
   * @returns {Number}
   */
  getMinutesBetweenDates: function (startDate, endDate) {
    var diff = endDate.getTime() - startDate.getTime();
    return (diff / 60000);
  },
  /*
   * deletes a file using a promise
   * @param sessionID the session id associated with this call
   * resolves true if the file is deleted
   */
  deleteFile: function (sessionID) {
    return new Promise(function (resolve, reject) {
      var key = sessionID + '_FilePath';
      CacheHandler.getValue(key)
        .then(function (filePath) {
          filePath = filePath.replace(/"/g, "");
          FileSystem.unlink(filePath, function (err) {
            if (err === null) {
              resolve(true);
            } else {
              reject(err);
            }
          });

        });

    });
  }
};

