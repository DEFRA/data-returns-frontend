'use strict';
const config = require('../lib/configuration-handler.js').Configuration;
const Request = require('request');

module.exports.lookup = function (queryString) {
    let endPoint = config.get('api.base') + '/' + config.get('api.endpoints.eaIdLookup');
    let requestOptions = {
        "uri": endPoint,
        "gzip": true,
        "timeout": 60000, //ms 60 seconds
        "qs": {
            "term": queryString
        }
    };

    return new Promise(function (resolve, reject) {
        Request.get(requestOptions, function (err, response) {
            if (err) {
                reject(err);
            } else if (!response) {
                reject(new Error("API request failed to provide response"));
            } else {
                if (response.statusCode !== 200) {
                    reject(new Error("Unexpected response status code " + response.statusCode));
                } else {
                    try {
                        let parsedJson = JSON.parse(response.body);
                        // Return the JSON response to the consumer
                        resolve(parsedJson);
                    } catch (err) {
                        reject(new Error("Unable to parse API response."));
                    }
                }
            }
        });
    });
};