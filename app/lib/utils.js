'use strict';
var fs = require('fs');
var CacheHandler = require('./cache-handler');
var mkdirp = require('mkdirp');
var config = require('../config/configuration_' + (process.env.NODE_ENV || 'local'));
var uuid = require('node-uuid');
var path = require('path');

/* loadFilesInDir: Recursivly loads file names in to an array
 * @param dir the parent base directory to scan
 * @param filelist an array to store filenames in
 * @return array
 */
var getFileListInDir = function (dir, filelist) {
  var files = fs.readdirSync(dir);
  var fileName;
  filelist = filelist || [];
  files.forEach(function (file) {
    if (fs.statSync(dir + '/' + file).isDirectory()) {
      filelist = getFileListInDir(dir + '/' + file, filelist);
    } else {
      fileName = path.join(dir, file);
      filelist.push(fileName);
    }
  });
  return filelist;
};

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
      fs.rename(oldPath, newPath, function (err) {
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
   * 
   * @param {type} date
   * @returns String representing a formatted date with leading zero's date i.e. 01-01-2000
   */
  getFormatedDate: function (date) {

    var day = date.getDate() < 10 ? '0' + date.getDate() : date.getDate();
    var month = (date.getMonth() + 1) < 10 ? '0' + (date.getMonth() + 1) : date.getMonth() + 1;
    var year = date.getFullYear();
    var sep = '-';
    return day + sep + month + sep + year;
  },
  /*
   * 
   * @param {type} date
   * @returns String representing a date formatted with leading zero's
   */
  getFormatedTime: function (date) {
    var hr = date.getHours() < 10 ? '0' + date.getHours() : date.getHours();
    var min = date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes();
    var sep = ':';
    return hr + sep + min;
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
          filePath = filePath ? filePath.replace(/"/g, '') : '';
          fs.unlink(filePath, function (err) {
            if (err === null) {
              resolve(true);
            } else {
              reject(err);
            }
          });
        });
    });
  },
  /*
   * Sorts an array of JSON objects based on a property in the objects
   * @param propertyName the propert name to sort on
   */
  sortByProperty: function (propertyName) {
    return function (a, b) {
      var sortStatus = 0;
      if (a[propertyName] < b[propertyName]) {
        sortStatus = -1;
      } else if (a[propertyName] > b[propertyName]) {
        sortStatus = 1;
      }
      return sortStatus;
    };
  },
  /*
   * Creates the upload directory
   */
  createUploadDirectory: function () {
    console.log('==> createUploadDirectory() ');
    var stats;
    try {
      // Query the entry
      stats = fs.lstatSync(config.upload.path);
    } catch (err) {
      stats = null;
    }

    try {
      // Is it a directory already?
      if (stats === null || !stats.isDirectory()) {
        mkdirp(config.upload.path, function (err) {
          if (err) {
            console.error(err);
          } else {
            console.log('<== createUploadDirectory() ' + config.upload.path + ' created.');
          }
        });
      } else {
        console.log('<== createUploadDirectory() Path already exists: ' + config.upload.path);
      }
    } catch (err) {
      console.error('<== createUploadDirectory() error: ' + err);
    }
  },
  /*
   * reads a file
   */
  readFile: function (path, callback) {
    try {
      var filename = require.resolve(path);
      fs.readFile(filename, 'utf8', callback);
    } catch (e) {
      callback(e);
    }
  },
  base64Decode: function (encodedInput) {
    //var ret = new Buffer(encodedInput, 'base64').toString('ascii');
    return encodedInput;// ret.replace(/"/g, "");
  },
  /*
   * generate a uuid
   */
  getNewUUID: function () {
    return uuid.v4();
  },
  /*
   * returns a list of files for a single directory name
   * @param dir the directory to scan for files.
   */
  getFileList: function (dir) {
    return fs.readdirSync(dir).reduce(function (list, file) {
      var name = path.join(file);
      return list.concat([name]);
    }, []);
  },
  /* loadFilesInDir: Recursivly loads file names in to an array
   * @param dir the parent base directory to scan
   * @param filelist an array to store filenames in
   * @return array
   */
  getFileListInDir: getFileListInDir
};

