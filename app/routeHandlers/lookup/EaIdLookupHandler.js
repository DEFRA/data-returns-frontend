'use strict';
const winston = require("winston");
const parse = require('csv').parse;
const lodash = require('lodash');
const fs = require('fs');
const records = new Array();

const recordMapByAddr = new Map();

const MAX_RESULTS = 100;


const COL_LIC_SITE = 1;
const COL_LIC_WML = 2;
const COL_LIC_AREF = 0;

const COL_LIC_OTHID = 3;
const COL_LIC_IPPCR = 4;
const COL_LIC_EPR = 5;

const COL_RB_CUR_PERMIT = 6;
const COL_RB_PPC_PERMIT_LIST = 7;

const COL_LIC_OS_L = 8;
const COL_LIC_OS_E = 9;
const COL_LIC_OS_N = 10;


const COL_ADDR_REF = 0;
const COL_ADDR_TYPE = 1;
const COL_ADDR_START = 4;
const COL_ADDR_END = 12;


// TODO: Temporary feed of data for UI prototyping
function readSiteInfo(callback) {
    let parser = parse({delimiter: ','}, function (err, rows) {
        if (err) {
            winston.error(err);
            return;
        }

        for (let i = 1; i < rows.length; i++) {
            let rowData = rows[i];
            let record = {
                eaId: rowData[COL_LIC_WML],
                siteName: rowData[COL_LIC_SITE],
                addRef: rowData[COL_LIC_AREF],
                addresses: new Array(),
                gridRef: rowData[COL_LIC_OS_L] + rowData[COL_LIC_OS_E] + rowData[COL_LIC_OS_N],
                altIds: new Array()
            };
            // LIC_OTHID & LIC_IPPCR
            if (rowData[COL_LIC_OTHID]) record.altIds.push(rowData[COL_LIC_OTHID]);
            if (rowData[COL_LIC_IPPCR]) record.altIds.push(rowData[COL_LIC_IPPCR]);

            // LIC_EPR (need substring before / if this is a variation)
            if (rowData[COL_LIC_EPR]) {
                if (rowData[COL_LIC_EPR].includes("/")) {
                    record.altIds.push(rowData[COL_LIC_EPR].split("/")[0]);
                } else {
                    record.altIds.push(rowData[COL_LIC_EPR]);
                }
            }

            // rbCurPermitRef
            if (rowData[COL_RB_CUR_PERMIT] && rowData[COL_RB_CUR_PERMIT] !== rowData[COL_LIC_WML]) {
                record.altIds.push(rowData[COL_RB_CUR_PERMIT]);
            }

            // rbPPCPermitList
            if (rowData[COL_RB_PPC_PERMIT_LIST]) {
                let values = rowData[COL_RB_PPC_PERMIT_LIST].split(/[ ,]+/);
                record.altIds = record.altIds.concat(values);
            }
            record.altIds = record.altIds.filter((id) => record.eaId !== id);
            record.altIds = lodash.sortedUniqBy(lodash.sortBy(record.altIds));

            records.push(record);
            recordMapByAddr.set(record.addRef, record);
        }

        if (callback) callback();
    });
    fs.createReadStream(__dirname + '/LICHOLD.csv').pipe(parser);
}

function readAddressInfo(callback) {
    let parser = parse({delimiter: ','}, function (err, rows) {
        if (err) {
            winston.error(err);
            return;
        }

        for (let i = 1; i < rows.length; i++) {
            let rowData = rows[i];
            let addressRef = rowData[COL_ADDR_REF];
            let addressType = rowData[COL_ADDR_TYPE];
            let siteRecord = recordMapByAddr.get(addressRef);

            if (siteRecord && addressType === "2") {
                let addrFields = rowData.slice(COL_ADDR_START, COL_ADDR_END).filter((part) => part != null && part.length > 0);
                let addressInfo = addrFields.join(", ");
                siteRecord.addresses.push(addressInfo);
            }
        }

        // Now all address info is populated, make sure the list is unique
        for (let r of records) {
            r.addresses = lodash.sortedUniqBy(lodash.sortBy(r.addresses));
        }

        if (callback) callback();

    });
    fs.createReadStream(__dirname + '/LICADDR.csv').pipe(parser);
}

readSiteInfo(readAddressInfo);


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
            let score = 0;
            for (let term of searchTerms) {
                let regex = new RegExp(term, 'gi');
                let eaIdMatch = record.eaId.match(regex);
                if (eaIdMatch && eaIdMatch.length > 0) {
                    score += eaIdMatch.length * term.length;
                }
                let siteMatch = record.siteName.match(regex);
                if (siteMatch && siteMatch.length > 0) {
                    score += siteMatch.length * term.length;
                }
                for (let alternativeId of record.altIds) {
                    let altIdMatch = alternativeId.match(regex);
                    if (altIdMatch && altIdMatch.length > 0) {
                        score += altIdMatch.length * term.length;
                    }
                }
                for (let address of record.addresses) {
                    let adrMatch = address.match(regex);
                    if (adrMatch && adrMatch.length > 0) {
                        score += adrMatch.length * term.length;
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