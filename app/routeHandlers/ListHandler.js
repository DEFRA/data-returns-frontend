'use strict';
const winston = require("winston");
var handler = require('../api-handlers/controlled-lists.js');
var csv = require('../lib/csv-handler.js');

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
        handler.getListProcessor(list, function(metadata, header, data) {
            reply.view('data-returns/display-list', {
                listMetaData: metadata,
                tableHeadings: header,
                rows: data,
                clear: false,
                back: request.info.referrer
            });
        }).catch(winston.error);
    },

    getDisplayHandlerWithSearch: function (request, reply) {
        var list = request.query.list;
        // if no search term pass control back to teh full list handler
        if (request.payload.search === '') {
            module.exports.getDisplayHandler(request, reply);
        } else {
            handler.getListMetaData().then(function (metadata) {
                handler.getListProcessor(list, function (metadata, header, data) {
                    winston.info(`==> /display-list-search list=${list} search=${metadata.defaultSearch} for search=${request.payload.search}`);
                    reply.view('data-returns/display-list', {
                        listMetaData: metadata,
                        tableHeadings: header,
                        rows: data,
                        clear: true,
                        back: request.info.referrer
                    });
                }, {field: metadata[list].defaultSearch, contains: request.payload.search}).catch(function (err) {
                    throw err.message;
                });
            }).catch(winston.error);
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

        handler.getListProcessor(request.params.list, function(metadata, header, data) {
            var result = csv.createCSV(header.map(h => h.name), data.map(r => r.row));
            var response = reply(result)
                .header('Content-Type', 'text/csv; charset=utf-8;')
                .header('content-disposition', `attachment; filename=${filename};`).hold();
            response.send();
        }).catch(winston.error);
    }
};