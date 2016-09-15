'use strict';

const winston = require("winston");
const config = require('../lib/configuration-handler.js').Configuration;

var Request = require('request');
var cacheHandler = require('../lib/cache-handler');
var redisKeys = require('../lib/redis-keys.js');

/**
 * Generalized async call to fetch data from the API
 * @param the list to be fetch or null for the list metadata
 * @returns {Promise}
 */
function apiCallList(list, search) {

    let endPoint = config.get('api.base') + '/' + config.get('api.endpoints.controlledLists');
    winston.info('==> apiCallList() url: ' + endPoint);

    var apiData = null;
    if (list)  {
        if (search) {
            apiData = { url: encodeURI(endPoint + '/' + list + '?field=' + search.field + '&contains=' + search.contains) };
        } else {
            apiData = { url: endPoint + '/' + list };
        }
    } else {
        apiData = { url: endPoint };
    }

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
        cacheHandler.getValue(redisKeys.LIST_METADATA.key).then(function (val) {
            if (val) {
                resolve(JSON.parse(val));
            } else {
                apiCallList().then(function (result) {
                    cacheHandler.setValue(redisKeys.LIST_METADATA.key, result).then(resolve(result)).catch(reject);
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
module.exports.getListData = function (list, search) {
    return new Promise(function (resolve, reject) {
        apiCallList(list, search).then(function (result) {
            resolve(result);
        }).catch(reject);
    });
};

/**
 * This function outputs cells as arrays or objects so the generic page can process either
 * @param listData
 * @param displayHeaders - an array the data object names
 * @returns {Array} The output data structure required by display-list.html
 */
module.exports.pageExtractor = function(listData, displayHeaders) {
    var rows = [];
    for (var r = 0; r < listData.length; r++) {
        var cols = [];
        for (var c = 0; c < displayHeaders.length; c++) {
            cols.push({item: listData[r][displayHeaders[c].field]});
        }
        rows.push({row: cols});
    }
    return rows;
};

/**
 * This function outputs every individual cell as an object so the CSV processor can act upon it
 * @param listData
 * @param displayHeaders - an array the data object names
 * @returns {Array} The output data structure required by the CSV processor
 */
module.exports.csvExtractor = function(listData, displayHeaders) {
    var rows = [];
    for (var r = 0; r < listData.length; r++) {
        var cols = [];
        for (var c = 0; c < displayHeaders.length; c++) {
            var item = [];
            if (Array.isArray(listData[r][displayHeaders[c].field])) {
                item = listData[r][displayHeaders[c].field].join(", ");
            } else {
                item = listData[r][displayHeaders[c].field];
            }
            cols.push(item);
        }
        rows.push({row: cols});
    }
    return rows;
};

/**
 * Process the results of the API call for controlled list data and
 * @param processor the list to processor
 * @param processor a function(metadata, header[], data[]) to act the result of the API
 * call for controlled list information. Returns via a promise
 */
module.exports.getListProcessor = function (extractorFunction, list, processor, search) {
    return new Promise(function (resolve, reject) {
        module.exports.getListMetaData().then(function (result) {
            var listMetaData = { displayHeaders : undefined };
            listMetaData = result[list];
            var tableHeadings = [];
            if (listMetaData.displayHeaders) {
                var displayHeaders = listMetaData.displayHeaders;
            } else {
                throw "Expected: displayHeaders";
            }
            // Generate an array for the column headings...hogan cannot handle maps/objects
            for (var i = 0; i < displayHeaders.length; i++) {
                tableHeadings.push({name: displayHeaders[i].field, description: displayHeaders[i].header});
            }
            // Now the actual list data
            module.exports.getListData(list, search).then(function (listData) {
                var rows = extractorFunction(listData, displayHeaders);
                processor(listMetaData, tableHeadings, rows);
                resolve(true);
            }).catch(reject);
        }).catch(reject);
    });
};

