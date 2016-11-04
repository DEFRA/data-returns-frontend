'use strict';
const winston = require("winston");
const parse = require('csv').parse;
const lodash = require('lodash');
const fs = require('fs');
const records = new Array();

const MAX_RESULTS = 100;

// TODO: Temporary feed of data for UI prototyping
(function () {
    let parser = parse({delimiter: ','}, function (err, rows) {
        for (let i = 1; i < rows.length; i++) {
            let rowData = rows[i];
            let record = {
                eaId: rowData[7],
                siteName: rowData[2],
                altIds: new Array()
            };
            if (rowData[6]) record.altIds.push(rowData[6]);
            if (rowData[5]) record.altIds.push(rowData[5]);
            records.push(record);
        }
    });
    fs.createReadStream(__dirname + '/permitTestData.csv').pipe(parser);
})();


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
            },
            {
                message: "Unable to talk to database...."
            }
        ]
    };

    if (searchString && searchString.length) {
        let searchTerms = searchString.split(/\s+/);

        let matches = records.map(function (record) {
            let eaId = record.eaId.toLowerCase();
            let site = record.siteName.toLowerCase();
            let score = 0;
            for (let term of searchTerms) {
                let lowerTerm = term.toLowerCase();

                if (eaId.includes(lowerTerm)) {
                    score += lowerTerm.length;
                }
                if (site.includes(lowerTerm)) {
                    score += lowerTerm.length
                }
                for (let alternativeId of record.altIds) {
                    let altId = alternativeId.toLowerCase();

                    if (altId.includes(lowerTerm)) {
                        score += lowerTerm.length;
                    }
                }
            }

            record.score = score;
            return record;
        }).filter((record) => record.score > 0).sort((a, b) => b.score - a.score);


        let messages = [];
        if (matches.length > MAX_RESULTS) {
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
    }
    reply.view('data-returns/eaid-lookup', data);
}


module.exports = {
    routeHandler: routeHandler
};