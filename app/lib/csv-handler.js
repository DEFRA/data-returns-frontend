'use strict';

module.exports = {
    /**
     * Convers javascript objects into .csv format
     * @param headers an array of headers
     * @param data - an array of arrays
     */
    createCSV: function (headers, data) {
        var result = '';
        var row = '';

        if(!Array.isArray(headers)) {
            throw 'Unexpected headers: require [String]';
        }

        for (var i = 0; i < headers.length; i++) {
            row += '"' + headers[i].trim() + '"';
            if (i < headers.length - 1) {
                row += ',';
            }
        }
        result += row + '\n';

        for(let line of data) {
            row = '';
            if(!Array.isArray(line)) {
                throw 'Unexpected headers: require [Object]';
            }

            for (var i = 0; i < line.length; i++) {
                row += '"' + line[i] + '"';
                if (i < line.length - 1) {
                    row += ',';
                }
            }
            result += row + '\n';
        }

        return result;
    }
};
