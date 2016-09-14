'use strict';

const winston = require("winston");
const config = require('../lib/configuration-handler.js').Configuration;

var fs = require('fs');
var mkdirp = require('mkdirp');
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
    getFormattedDate: function (date) {

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
    getFormattedTime: function (date) {
        var hr = date.getHours() < 10 ? '0' + date.getHours() : date.getHours();
        var min = date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes();
        var sep = ':';
        return hr + sep + min;
    },
    /*
     * Creates the upload directory
     */
    createUploadDirectory: function () {
        winston.info('==> createUploadDirectory() ');
        var stats;
        try {
            // Query the entry
            stats = fs.lstatSync(config.get('upload.path'));
        } catch (err) {
            stats = null;
        }

        // Is it a directory already?
        if (stats === null || !stats.isDirectory()) {
            mkdirp(config.upload.path, function (err) {
                if (err) {
                    return winston.error(err);
                }
                winston.info('<== createUploadDirectory() ' + config.get('upload.path') + ' created.');
            });
        } else {
            winston.info('<== createUploadDirectory() Path already exists: ' + config.get('upload.path'));
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
    /*
     * generate a uuid
     */
    getNewUUID: uuid.v4,
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
    getFileListInDir: getFileListInDir,
    /*
     * pad : add len number of leading zero's to num
     * @param num the number to zero pad
     * @param len the total length num should be with leading zero's
     */
    pad: function pad(num, len) {
        return (Array(len).join('0') + num).slice(-len);
    },

    isInt: function (value) {
        return !isNaN(value) &&
            parseInt(Number(value)) === value &&
            !isNaN(parseInt(value, 10));
    }

};

