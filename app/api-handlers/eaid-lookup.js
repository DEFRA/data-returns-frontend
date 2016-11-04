'use strict';
const winston = require("winston");
const config = require('../lib/configuration-handler.js').Configuration;

var Request = require('request');
var cacheHandler = require('../lib/cache-handler');
var redisKeys = require('../lib/redis-keys.js');

function lookup(termsArr) {
    let endPoint = config.get('api.base') + '/' + config.get('api.endpoints.eaIdLookup');
    let requestData = null;

    if (list)  {
        if (search) {
            requestData = { url: encodeURI(endPoint + '/' + list + '?field=' + search.field + '&contains=' + search.contains) };
        } else {
            requestData = { url: endPoint + '/' + list };
        }
    } else {
        requestData = { url: endPoint };
    }

    return new Promise(function (resolve, reject) {
        Request.get(requestData, function (err, httpResponse) {
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
