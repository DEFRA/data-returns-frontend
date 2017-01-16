'use strict';
const winston = require("winston");
const stringify = require('csv').stringify;
var handler = require('../../api-handlers/controlled-lists.js');

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
            var items = [];
            for (var key in result) {
                if (result.hasOwnProperty(key)) {
                    items.push(result[key]);
                }
            }
            reply.view('data-returns/controlled-lists', {
                controlledLists: items
            });
        }).catch(winston.error);
    },

    /**
     * Display list data
     * @param request
     * @param reply
     */
    getDisplayHandler: function (request, reply) {
        var list = request.query.list;
        winston.info('==> /display-list ' + list);
        handler.getListProcessor(handler.pageExtractor, list, function(metadata, header, data) {
            reply.view('data-returns/display-list', {
                listMetaData: metadata,
                tableHeadings: header,
                rows: data,
                clear: false,
                back: request.info.referrer || "/controlled-lists"
            });
        }).catch(() => reply.redirect("/controlled-lists"));
    },

    getDisplayHandlerWithSearch: function (request, reply) {
        var list = request.query.list;
        // if no search term pass control back to the full list handler
        if (request.payload.search === '') {
            module.exports.getDisplayHandler(request, reply);
        } else {
            handler.getListMetaData().then(function (metadata) {
                handler.getListProcessor(handler.pageExtractor, list, function (metadata, header, data) {
                    winston.info(`==> /display-list-search list=${list} search=${metadata.defaultSearch} for search=${request.payload.search}`);
                    reply.view('data-returns/display-list', {
                        listMetaData: metadata,
                        tableHeadings: header,
                        rows: data,
                        clear: true,
                        back: request.info.referrer || "/controlled-lists"
                    });
                }, {field: metadata[list].defaultSearch, contains: request.payload.search}).catch(function (err) {
                    throw err.message;
                });
            }).catch(() => reply.redirect("/controlled-lists"));
        }
    },

    /**
     * Serve list csv
     *
     * @param request
     * @param reply
     */
    getCSVHandler: function(request, reply) {
        if (!request.params || !request.params.list) {
            throw 'Excepted - filename';
        }

        var filename = request.params.list + '.csv';
        winston.info('==> /csv-list ' + filename);

        handler.getListProcessor(handler.csvExtractor, request.params.list, function(metadata, header, data) {
            let columns = header.map(h => h.description);
            let rows = data.map(r => r.row);
            stringify(rows, { header: true, columns: columns, quoted: true }, function(err, output) {
                if (err) {
                    winston.error("Failed to write downloadable CSV for controlled lists.", err);
                    reply.redirect('data-returns/failure');
                } else {
                    // UTF8 BOM is required so as not to corrupt special UTF8 characters in Excel.
                    const UTF8_BOM = "\uFEFF";
                    var response = reply(UTF8_BOM + output)
                        .header('Content-Type', 'text/csv; charset=utf-8;')
                        .header('content-disposition', `attachment; filename=${filename};`)
                        .hold();
                    response.send();
                }
            });
        }).catch(winston.error);
    }
};