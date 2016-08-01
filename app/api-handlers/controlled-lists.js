'use strict';

var Request = require('request');
var config = require('../config/configuration_' + (process.env.NODE_ENV || 'local'));
var cacheHandler = require('../lib/cache-handler');

/**
 * Get list metadata from (a) the redis cache or (b) the server
 */

function apiCallList(list) {
    var apiData = {
        url: config.API.endpoints.CONTROLLEDLISTS,
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
                if (httpResponse.statusCode != 200) {
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

module.exports.getListData = function (list) {
    return new Promise(function (resolve, reject) {
        // List is undefined for the metadata -
        cacheHandler.getValue(list || 'metadata').then(function (val) {
            if (val) {
                resolve(JSON.parse(val));
            } else {
                //var ret = [{"displayHeaders":{"name":"Units","description":"Description","measureType":"Measurement Type"},"description":"Units and measures","path":"units"},{"displayHeaders":{"name":"Name"},"description":"Parameters - substance names - and CAS","path":"parameters"},{"displayHeaders":{"name":"Name"},"description":"Reference period","path":"ref_period"},{"displayHeaders":{"name":"Name"},"description":"Monitoring period","path":"mon_period"},{"displayHeaders":{"name":"Name"},"description":"Monitoring standard or method","path":"method"},{"displayHeaders":{"name":"Name"},"description":"Return type","path":"rtn_type"}];
                apiCallList(list || 'metadata').then(function (result) {
                    cacheHandler.setValue(list || 'metadata', result).then(function (status) {
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
}