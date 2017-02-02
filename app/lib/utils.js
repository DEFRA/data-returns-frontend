'use strict';
module.exports = {
    /*
     * pad : add len number of leading zero's to num
     * @param num the number to zero pad
     * @param len the total length num should be with leading zero's
     */
    pad: function pad(num, len) {
        return (Array(len).join('0') + num).slice(-len);
    },
};

