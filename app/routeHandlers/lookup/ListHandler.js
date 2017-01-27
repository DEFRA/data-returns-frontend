'use strict';
const winston = require("winston");
const stringify = require('csv').stringify;
let handler = require('../../api-handlers/controlled-lists.js');


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
            reply.redirect('data-returns/failure');
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
        // if no search term pass control back to the full list handler
        let searchString = request.query.q || '';
        searchString = searchString.trim();
        if (searchString === '') {
            module.exports.getDisplayHandler(request, reply);
        } else {
            let resultHandler = function (metadata, headings, data) {
                winston.info(`==> /display-list-search list=${list} search=${metadata.searchFields} for search=${searchString}`);
                let searchTerms = searchString.split(/\s+/);
                let entryText = data.length === 1 ? "entry" : "entries";
                let searchTermStrings = searchTerms.map(t => `"${t}"`).join(", ").replace(/,(?!.*,)/gmi, ' or');
                let searchableHeadings = metadata.searchFields.map(t => metadata.displayHeaders.find(d => d.field === t));

                let messages = [];
                messages.push(`Found ${data.length} ${entryText} matching ${searchTermStrings}`);

                if (data.length === 0 && headings.length > 1 && searchableHeadings.length < headings.length) {
                    let searchableHeadingNames = searchableHeadings.map(t => `"${t.header}"`).join(", ").replace(/,(?!.*,)/gmi, ' and');
                    messages.push(`You can search for entries under the ${searchableHeadingNames} ${searchableHeadings.length === 1 ? 'heading' : 'headings'}`);
                }

                reply.view('data-returns/display-list', {
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
                });
            };

            return handler.getListProcessor(handler.pageExtractor, list, resultHandler, {contains: searchString}).catch((err) => {
                winston.error(err);
                reply.view('data-returns/display-list', {
                    messages: ["A problem occurred while attempting to filter the list, please try again later."]
                });
            });
        }
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
                    reply.redirect('data-returns/failure');
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