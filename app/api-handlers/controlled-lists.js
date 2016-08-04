'use strict';

var Request = require('request');
var config = require('../config/configuration_' + (process.env.NODE_ENV || 'local'));
var cacheHandler = require('../lib/cache-handler');

/**
 * Generalized async call to fetch data from the API
 * @param the list to be fetch or null for the list metadata
 * @returns {Promise}
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

/**
 * Get the controlled list meta data back from the API or the cache
 * @returns {Promise}
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
                    }).catch(reject);
                }).catch(reject);
            }
        }).catch(reject);
    });
};

/**
 * Get the (uncached) body data back from the controlled list api
 * @param list
 * @returns {Promise}
 */
module.exports.getListData = function (list) {
    return new Promise(function (resolve, reject) {
        apiCallList(list).then(function (result) {
            resolve(result);
        }).catch(reject);
    });
};

/**
 * Process the results of the API call for controlled list data and
 * @param processor the list to processor
 * @param processor a function(metadata, header[], data[]) to act the result of the API
 * call for controlled list information. Returns via a promise
 */
module.exports.getListProcessor = function (list, processor) {
    return new Promise(function (resolve, reject) {
        module.exports.getListMetaData().then(function (result) {
            var listMetaData = result[list];
            var tableHeadings = [];
            if (listMetaData.displayHeaders) {
                var displayHeaders = listMetaData.displayHeaders;
            } else {
                throw "Expected: displayHeaders";
            }
            // Generate an array for the column headings...hogan cannot handle maps/objects
            for (var key in displayHeaders) {
                if (displayHeaders.hasOwnProperty(key)) {
                    tableHeadings.push({name: key, description: displayHeaders[key]});
                }
            }
            // Now the actual list data
            module.exports.getListData(list).then(function (listData) {
                var rows = [];
                for (var i = 0; i < listData.length; i++) {
                    var cols = [];
                    for (var key in listData[i]) {
                        if (listData[i].hasOwnProperty(key) && displayHeaders.hasOwnProperty(key)) {
                            cols.push(listData[i][key]);
                        }
                    }
                    rows.push({row: cols});
                }
                processor(listMetaData, tableHeadings, rows);
                resolve(true);
            }).catch(reject);
        }).catch(reject);
    });
};

