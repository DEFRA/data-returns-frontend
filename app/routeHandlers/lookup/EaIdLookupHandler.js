'use strict';
const winston = require("winston");
const api = require('../../api-handlers/eaid-lookup');
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
    let data = {
        errors: [
            {
                message: "Please enter something to search for...."
            }
        ]
    };

    if (searchString && searchString.length) {
        let searchTerms = searchString.split(/\s+/);
        api.lookup(searchString).then(function (response) {
            let matches = response.results;
            let messages = [];

            if (matches.length === 0) {
                messages.push("No results were found.");
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
            reply.view('data-returns/eaid-lookup', data);
        }).catch(function (error) {
            winston.error(error);
            reply.view('data-returns/eaid-lookup', {
                errors: [
                    {
                        message: "We’re experiencing problems with the service, please try again later."
                    }
                ]
            });
        });
    } else {
        reply.view('data-returns/eaid-lookup', data);
    }
}

module.exports = {
    routeHandler: routeHandler
};