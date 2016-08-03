'use strict';
var handler = require('../api-handlers/controlled-lists.js');
var errBit = require('../lib/errbitErrorMessage');
//var Joi = require('joi');

module.exports = {
    /*
     *  HTTP handler for '/controlled-lists' route
     *  @Param request
     *  @Param reply
     */

    /*
     * get handler for '/controlled-lists' route
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

    getDisplayHandler: function (request, reply) {
        var list = request.query.list;
        console.log('==> /display-list ' + list);

        // Get the meta data again - from the redis cache
        handler.getListMetaData().then(function (result) {
            var listMetaData = result[list];
            var tableHeadings = [];
            // Generate an array for the column headings...hogan cannot handle maps/objects
            for (var key in listMetaData.displayHeaders) {
                if (listMetaData.displayHeaders.hasOwnProperty(key)) {
                    tableHeadings.push({ name: key, description: listMetaData.displayHeaders[key]});
                }
            }
            // Now the actual list data
            handler.getListData(list).then(function (listData) {
                // The list data has to be converted into an array of arrays
                // because the mustache templating does not
                // support procedural logic
                var rows = [];
                for (var i = 0; i < listData.length; i++) {
                    var cols = [];
                    for (var key in listData[i]) {
                        if(listData[i].hasOwnProperty(key) && listMetaData.displayHeaders.hasOwnProperty(key)) {
                            cols.push(listData[i][key]);
                        }
                    }
                    rows.push({row: cols});
                }
                //console.log(rows);
                reply.view('data-returns/display-list', {
                    listMetaData: listMetaData,
                    tableHeadings: tableHeadings,
                    rows: rows
                });
            });
        }).catch(function (err) {
            var msg = new errBit.errBitMessage(err, __filename, 'getHandler()', err.stack);
            console.error(msg);
        });
    },

    getCSVHandler: function(request, reply) {
        var list = request.query.list;
        console.log('==> /csv-list ' + list);
        //var h = request.response.headers;
        reply.file(__filename);

    }
    /*
     header("Content-disposition: attachment; filename=huge_document.pdf");

     Then set the MIME-type of the file:

     header("Content-type: application/pdf");
     */
};

