'use strict';

var Request = require('request');
var config = require('../config/configuration_' + (process.env.NODE_ENV || 'local'));
var cacheHandler = require('../lib/cache-handler');

/**
 * Get list metadata from (a) the redis cache or (b) the server
 */

function apiCallList(list) {
    var apiData = {
        url: list ? config.API.endpoints.CONTROLLEDLISTS + '/' + list : config.API.endpoints.CONTROLLEDLISTS,
        headers: {}
    };

    return new Promise(function (resolve, reject) {
        Request.get(apiData, function (err, httpResponse) {
            if (!httpResponse) {
                reject({
                    isUserError: true,
                    message: 'No response'
                });
            } else if (err) {
                reject({
                    isUserError: true,
                    message: 'Request Error',
                    messageDetail: err.message
                });
            } else {
                if (httpResponse.statusCode !== 200) {
                    reject({
                        isUserError: true,
                        message: 'Request Error: ' + httpResponse.statusCode,
                        messageDetail: httpResponse.statusMessage
                    });
                } else {
                    try {
                        var parsedJson = JSON.parse(httpResponse.body);
                        // Return the result as an array
                        resolve(parsedJson);
                    } catch (err) {
                        reject({
                            isUserError: true,
                            message: 'Invalid JSON Response: ',
                            messageDetail: err.message
                        });
                    }
                }
            }
        });
    });
}

/*
 * The list meta data is cached in redis
 */
module.exports.getListMetaData = function () {
    return new Promise(function (resolve, reject) {
        // List is undefined for the metadata -
        cacheHandler.getValue('metadata').then(function (val) {
            if (val) {
                resolve(JSON.parse(val));
            } else {
                apiCallList().then(function (result) {
                    cacheHandler.setValue('metadata', result).then(function () {
                        resolve(result);
                    }).catch(function (cacheErrSet) {
                        reject(cacheErrSet);
                    });
                }).catch(function (apiErr) {
                    reject(apiErr);
                });
            }
        }).catch(function (cacheErrGet) {
            reject(cacheErrGet);
        });
    });
};

// The list data will not be cached as it can be large and filtered
// for the moment anyway
module.exports.getListData = function (list) {
    return new Promise(function (resolve, reject) {
        apiCallList(list).then(function (result) {
            resolve(result);
        }).catch(function (apiErr) {
            reject(apiErr);
        });
    });
};