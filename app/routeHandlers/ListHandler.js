'use strict';
var handler = require('../api-handlers/controlled-lists.js');
var errBit = require('../lib/errbitErrorMessage');
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
        console.log('==> /controlled-lists');
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
        }).catch(function (err) {
            var msg = new errBit.errBitMessage(err, __filename, 'getHandler()', err.stack);
            console.error(msg);
        });
    },

    /**
     * Display list data
     * @param request
     * @param reply
     */
    getDisplayHandler: function (request, reply) {
        var list = request.query.list;
        console.log('==> /display-list ' + list);
        handler.getListProcessor(list, function(metadata, header, data) {
            reply.view('data-returns/display-list', {
                listMetaData: metadata,
                tableHeadings: header,
                rows: data
            });
        }).catch(function (err) {
            var msg = new errBit.errBitMessage(err, __filename, 'getHandler()', err.stack);
            console.error(msg);
        });
    },

    /**
     * Serve list csv
     * @param request
     * @param reply
     */
    getCSVHandler: function(request, reply) {
        if (!request.params || !request.params.list) {
            throw 'Excepted - filename';
        }

        var filename = request.params.list + '.csv';
        console.log('==> /csv-list ' + filename);

        handler.getListProcessor(request.params.list, function(metadata, header, data) {
            var result = csv.createCSV(header.map(h => h.name), data.map(r => r.row));
            var response = reply(result)
                .header('Content-Type', 'text/csv; charset=utf-8;')
                .header('content-disposition', `attachment; filename=${filename};`).hold();
            response.send();
        }).catch(function (err) {
            var msg = new errBit.errBitMessage(err, __filename, 'getHandler()', err.stack);
            console.error(msg);
        });
    }
};


