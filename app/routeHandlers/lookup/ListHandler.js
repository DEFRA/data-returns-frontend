'use strict';

const winston = require("winston");
const stringify = require('csv').stringify;
const handler = require('../../api-handlers/controlled-lists.js');
const errorMessages = require('../../lib/error-messages');
const errorHandler = require('../../lib/error-handler');

let getNavigationSource = function (request) {
    return request.query.src || request.info.referrer || "/guidance/landfill-data-rules";
};

module.exports = {
    /*
     *  HTTP handler for '/controlled-lists' route
     *  @Param request
     *  @Param reply
     */

    /**
     * Display list metadata
     * @param request
     * @param reply
     */
    getHandler: function (request, reply) {
        winston.info('==> /controlled-lists');
        handler.getListMetaData().then(function (result) {
            let items = [];
            for (let key in result) {
                if (result.hasOwnProperty(key)) {
                    let item = result[key];
                    if (item.displayHeaders.length > 0) {
                        items.push(item);
                    }
                }
            }
            reply.view('data-returns/controlled-lists', {
                controlledLists: items
            });
        }).catch((err) => {
            winston.error(err);
            reply.redirect('/failure');
        });
    },

    /**
     * Display list data
     * @param request
     * @param reply
     */
    getDisplayHandler: function (request, reply) {
        let list = request.query.list;
        winston.info('==> /display-list ' + list);
        handler.getListProcessor(handler.pageExtractor, list, function (metadata, header, data) {
            reply.view('data-returns/display-list', {
                listMetaData: metadata,
                tableHeadings: header,
                rows: data,
                clear: false,
                src: getNavigationSource(request)
            });
        }).catch(() => reply.redirect("/controlled-lists"));
    },

    getDisplayHandlerWithSearch: function (request, reply) {
        let list = request.query.list;

        if (!list) {
            reply.redirect("/controlled-lists");
        }

        let searchString = request.query.q ? request.query.q.trim() : '';
        let errorCode = null;
        let errorMessage = null;
        let resultHandler = null;

        if (!searchString || !searchString.length) {
            resultHandler = function (metadata, headings, data) {
                errorCode = errorMessages.LIST_LOOKUP.NOTHING_TO_SEARCH_WITH;
                errorMessage = errorHandler.render(errorCode);

                reply.view('data-returns/display-list', {
                    listMetaData: metadata,
                    tableHeadings: headings,
                    rows: data,
                    clear: true,
                    src: getNavigationSource(request),
                    errorMessage: errorMessage
                });

            };

        } else {
            searchString = searchString.trim();

            resultHandler = function (metadata, headings, data) {
                winston.info(`==> /display-list-search list=${list} search=${metadata.searchFields} for search=${searchString}`);

                let searchTerms = searchString.split(/\s+/);
                let entryText = data.length === 1 ? "entry" : "entries";
                let searchTermStrings = searchTerms.map(t => `"${t}"`).join(", ").replace(/,(?!.*,)/gmi, ' or');
                let searchableHeadings = metadata.searchFields.map(t => metadata.displayHeaders.find(d => d.field === t));
                let searchableHeadingNames = null;
                let messages = [];

                messages.push(`Found ${data.length} ${entryText} matching ${searchTermStrings}`);

                if (data.length === 0 && headings.length > 1 && searchableHeadings.length < headings.length) {
                    searchableHeadingNames = searchableHeadings.map(t => t.header).join(", ").replace(/,(?!.*,)/gmi, ' and');
                }

                let replyObj = {
                    listMetaData: metadata,
                    tableHeadings: headings,
                    rows: data,
                    clear: true,
                    src: getNavigationSource(request),
                    messages: messages,
                    query: {
                        string: searchString,
                        terms: searchTerms
                    }
                };

                if (data.length === 0) {
                    errorCode = errorMessages.LIST_LOOKUP.NO_RESULTS;

                    errorMessage = errorHandler.render(errorCode, {
                        searchString : searchString,
                        errorMessage : errorMessage,
                        searchableHeadingNames : searchableHeadingNames
                    });

                    replyObj.errorMessage = errorMessage;
                }

                reply.view('data-returns/display-list', replyObj);
            };

        }

        return handler.getListProcessor(handler.pageExtractor, list, resultHandler, { contains: searchString }).catch((err) => {
            winston.error(err);
            errorCode = errorMessages.SERVICE.NO_SERVICE;
            errorMessage = errorHandler.render(errorCode);

            reply.view('data-returns/display-list', {
                errorMessage: errorMessage
            });
        });
    },

    /**
     * Serve list csv
     *
     * @param request
     * @param reply
     */
    getCSVHandler: function (request, reply) {
        if (!request.params || !request.params.list) {
            throw 'Excepted - filename';
        }

        let filename = request.params.list + '.csv';
        winston.info('==> /csv-list ' + filename);

        handler.getListProcessor(handler.csvExtractor, request.params.list, function (metadata, header, data) {
            let columns = header.map(h => h.description);
            let rows = data.map(r => r.row);
            stringify(rows, {header: true, columns: columns, quoted: true}, function (err, output) {
                if (err) {
                    winston.error("Failed to write downloadable CSV for controlled lists.", err);
                    reply.redirect('/failure');
                } else {
                    // UTF8 BOM is required so as not to corrupt special UTF8 characters in Excel.
                    const UTF8_BOM = "\uFEFF";
                    let response = reply(UTF8_BOM + output)
                        .header('Content-Type', 'text/csv; charset=utf-8;')
                        .header('content-disposition', `attachment; filename=${filename};`)
                        .hold();
                    response.send();
                }
            });
        }).catch(winston.error);
    }
};