'use strict';
const winston = require("winston");
const api = require('../../api-handlers/eaid-lookup');
const errorMessages = require('../../lib/error-messages');
const errorHandler = require('../../lib/error-handler');

const MAX_RESULTS = 100;

function routeHandler(request, reply) {
    if (request.query.q !== undefined) {
        searchHandler(request, reply);
    } else {
        getHandler(request, reply);
    }
}

function getHandler(request, reply) {
    reply.view('data-returns/eaid-lookup', {});
}

function searchHandler(request, reply) {
    let searchString = request.query.q;
    let errorCode = null;
    let errorMessage = null;
    let data = null;

    if (searchString && searchString.length) {
        let searchTerms = searchString.split(/\s+/);

        api.lookup(searchString).then(function (response) {
            let matches = response.results;
            let messages = [];

            if (matches.length === 0) {
                errorCode = errorMessages.EA_ID_LOOKUP.NO_RESULTS;
                errorMessage = errorHandler.render(errorCode, {searchString: searchString});
            } else if (matches.length > MAX_RESULTS) {
                messages.push(`Displaying the first ${MAX_RESULTS} results of ${matches.length} in total.`);
                matches.splice(MAX_RESULTS, matches.length - MAX_RESULTS);
            }

            data = {
                query: {
                    string: searchString,
                    terms: searchTerms
                },
                messages: messages,
                results: matches
            };

            if (errorMessage) {
                data.errorMessage = errorMessage;
            }

            reply.view('data-returns/eaid-lookup', data);

        }).catch(function (error) {
            winston.error(error);
            errorCode = errorMessages.SERVICE.NO_SERVICE;
            errorMessage = errorHandler.render(errorCode);
            reply.view('data-returns/eaid-lookup', {
                errorMessage: errorMessage
            });
        });
    } else {
        errorCode = errorMessages.EA_ID_LOOKUP.NOTHING_TO_SEARCH_WITH;
        errorMessage = errorHandler.render(errorCode);
        reply.view('data-returns/eaid-lookup', {
            errorMessage: errorMessage
        });
    }
}

module.exports = {
    routeHandler: routeHandler
};