'use strict';

const winston = require('winston');
const config = require('../lib/configuration-handler.js').Configuration;

const Request = require('request');
const cacheHandler = require('../lib/cache-handler');
const redisKeys = require('../lib/redis-keys.js');

/**
 * Generalized async call to fetch data from the API
 * @param the list to be fetch or null for the list metadata
 * @returns {Promise}
 */
function apiCallList (list, search) {
    const endPoint = config.get('api.base') + '/' + config.get('api.endpoints.controlledLists');
    winston.info('==> apiCallList() url: ' + endPoint);

    let apiData = null;
    if (list) {
        if (search) {
            apiData = {url: encodeURI(endPoint + '/' + list + '?contains=' + search.contains)};
        } else {
            apiData = {url: endPoint + '/' + list};
        }
    } else {
        apiData = {url: endPoint};
    }

    return new Promise(function (resolve, reject) {
        Request.get(apiData, function (err, httpResponse) {
            if (!httpResponse) {
                reject(new Error('Internal Error: No response from API'));
            } else if (err) {
                winston.error('Error communicating with controlled list API.', err);
                reject(err);
            } else {
                if (httpResponse.statusCode !== 200) {
                    reject(new Error(`Internal Error: Unexpected response ${httpResponse.statusCode} from API: ${httpResponse.statusMessage}`));
                } else {
                    try {
                        const parsedJson = JSON.parse(httpResponse.body);
                        // Return the result as an array
                        resolve(parsedJson);
                    } catch (err) {
                        reject(err);
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
            resolve(result[list]);
        }).catch(reject);
    });
};

/**
 * This function outputs cells as arrays or objects so the generic page can process either
 * @param listData
 * @param displayHeaders - an array the data object names
 * @returns { headers: { description: description: name: name }, rows: rows }
 */
module.exports.pageExtractor = function (listData, displayHeaders) {
    const rows = [];

    // Iterate and collect the output data
    for (let r = 0; r < listData.length; r++) {
        const cols = [];
        for (let c = 0; c < displayHeaders.length; c++) {
            cols.push({
                item: listData[r][displayHeaders[c].field],
                cellCls: displayHeaders[c].field
            });
        }
        rows.push({row: cols});
    }

    // Return the specified structure
    return {
        headers: displayHeaders.map(e => {
            return {name: e.field, description: e.header};
        }),
        rows: rows
    };
};

/**
 * This function outputs every individual cell as an object so the CSV processor can act upon it
 * @param listData
 * @param displayHeaders - an array the data object names
 * @returns { headers: { description: description: name: name }, rows: rows }
 */
module.exports.csvExtractor = function (listData, displayHeaders) {
    const rows = [];

    // Iterate and collect the output data
    for (let r = 0; r < listData.length; r++) {
        const cols = [];
        for (let c = 0; c < displayHeaders.length; c++) {
            let item = [];
            if (Array.isArray(listData[r][displayHeaders[c].field])) {
                item = listData[r][displayHeaders[c].field].join(', ');
            } else {
                item = listData[r][displayHeaders[c].field];
            }
            cols.push(item);
        }
        rows.push({row: cols});
    }

    // Return the specified structure
    // Return the specified structure
    return {
        headers: displayHeaders.map(e => {
            return {name: e.field, description: e.header};
        }),
        rows: rows
    };
};

/**
 * This function outputs every individual cell as an object so the CSV processor can act upon it.
 * This version of the csv handler will put all the aliases (alternatives) into
 * individual cells. The aliases will be counted and given headers of
 * Alternative 1, Alternative 2, Alternative 3.
 *
 * The extractor functions are now responsible for creating the headers
 * - the extractor functions will return an object describing the headers and listing the data
 *
 * @param listData
 * @param displayHeaders - an array the data object names
 * @returns { headers: { description: description: name: name }, rows: rows }
 */
module.exports.csvExtractorPivot = function (listData, displayHeaders) {
    const rows = [];

    // Calculate the number of columns and append a counter to the array header
    // names.
    for (let r = 0; r < listData.length; r++) {
        for (let c = 0; c < displayHeaders.length; c++) {
            if (listData[r][displayHeaders[c].field]) {
                displayHeaders[c].pivotHeaders = displayHeaders[c].pivotHeaders || [];
                if (Array.isArray(listData[r][displayHeaders[c].field])) {
                    if (listData[r][displayHeaders[c].field].length > displayHeaders[c].pivotHeaders.length) {
                        for (let i = displayHeaders[c].pivotHeaders.length; i < listData[r][displayHeaders[c].field].length; i++) {
                            displayHeaders[c].pivotHeaders.push({
                                name: displayHeaders[c].field,
                                description: displayHeaders[c].header + `(${i + 1})`
                            });
                        }
                    }
                } else {
                    if (displayHeaders[c].pivotHeaders.length === 0) {
                        displayHeaders[c].pivotHeaders.push({
                            name: displayHeaders[c].field,
                            description: displayHeaders[c].header
                        });
                    }
                }
            }
        }
    }

    // Iterate and collect the output data
    for (let r = 0; r < listData.length; r++) {
        const cols = [];
        for (let c = 0; c < displayHeaders.length; c++) {
            let item = [];
            if (Array.isArray(displayHeaders[c].pivotHeaders) && displayHeaders[c].pivotHeaders.length > 1) {
                for (let a = 0; a < displayHeaders[c].pivotHeaders.length; a++) {
                    item = Array.isArray(listData[r][displayHeaders[c].field]) ? listData[r][displayHeaders[c].field][a] : null;
                    cols.push(item);
                }
            } else {
                item = listData[r][displayHeaders[c].field];
                cols.push(item);
            }
        }
        rows.push({row: cols});
    }

    // Return the specified structure
    return {
        headers: [].concat.apply([], displayHeaders.map(e => e.pivotHeaders)),
        rows: rows
    };
};

/**
 * Process the results of the API call for controlled list data and
 * @param processor the list to processor
 * @param processdisplayHeaders["0"]or a function(metadata, header[], data[]) to act the result of the API
 * call for controlled list information. Returns via a promise
 */
module.exports.getListProcessor = function (extractorFunction, list, processor, search) {
    return new Promise(function (resolve, reject) {
        module.exports.getListMetaData().then(function (result) {
            let listMetaData = {displayHeaders: undefined};
            listMetaData = result[list];
            let displayHeaders = {};
            if (listMetaData && listMetaData.displayHeaders) {
                displayHeaders = listMetaData.displayHeaders;
            } else {
                throw new Error('Expected: displayHeaders');
            }
            // Now the actual list data
            module.exports.getListData(list, search).then(function (listData) {
                const result = extractorFunction(listData, displayHeaders);
                processor(listMetaData, result.headers, result.rows);
                resolve(true);
            }).catch(reject);
        }).catch(reject);
    });
};
