'use strict';
const winston = require('winston');
const request = require('request');
const config = require('../lib/configuration-handler.js').Configuration;

/**
 * Asks the Data Exchange service to submit a file that has previously been
 * uploaded and validated.
 * @param upload the file upload data including the response given by the ECM submissions API when this file was originally uploaded
 * @param userEmail The email address entered by the user.
 * @returns {Promise} A promise that is fulfilled when submission is
 *   successfully competed, or rejected if an error occurs.  If
 *   successful, the promise is resolve with Boolean true.  For rejection
 *   details see processApiResponse().
 */
module.exports.confirmFileSubmission = function (upload, userEmail) {
    const uploadedDatasetsCollection = upload.status.server._links.datasets.href;

    const datasetsCollectionRequest = {
        url: uploadedDatasetsCollection,
        method: 'GET',
        // TODO: Remove basic auth and add functionality to pass through auth token once integrated with the IDM
        auth: {
            user: config.get('endpoints.ecm_api.auth.username'),
            password: config.get('endpoints.ecm_api.auth.password'),
            sendImmediately: true
        }
    };

    return new Promise(function (resolve, reject) {
        request(datasetsCollectionRequest, function (err, response, body) {
            if (!err && response.statusCode === 200) {
                const data = JSON.parse(body);
                const datasetHrefs = data._embedded.datasets.map(d => d._links.self.href);

                const datasetSubmissionPromises = datasetHrefs.map(href => {
                    return new Promise(function (resolve, reject) {
                        winston.info(`Setting ${href} to submitted`);
                        const submitRequest = {
                            url: href,
                            method: 'PATCH',
                            json: {
                                'originator_email': userEmail,
                                'status': 'SUBMITTED'
                            },
                            // TODO: Remove basic auth and add functionality to pass through auth token once integrated with the IDM
                            auth: {
                                user: config.get('endpoints.ecm_api.auth.username'),
                                password: config.get('endpoints.ecm_api.auth.password'),
                                sendImmediately: true
                            }
                        };
                        request(submitRequest, function (err, response) {
                            if (!err && response.statusCode === 200) {
                                resolve();
                            } else {
                                winston.error(`Unexpected error attempting to submit dataset ${href}`, err || response);
                                reject(err || response);
                            }
                        });
                    });
                });
                Promise.all(datasetSubmissionPromises).then(resolve).catch(reject);
            } else {
                winston.error('Error communicating with data-exchange API', err || response);
                reject(err || response);
            }
        });
    });
};
