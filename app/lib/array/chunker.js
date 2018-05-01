'use strict';
/**
 * Break the given array up into chunks based on the target chunk size.  Unless the array is exactly divisible
 * into the chunk size then the algorithm will attempt to balance the chunks as equally as possible with each chunk
 * smaller than the target chunk size.
 * For example, given an array of 9 items and a target chunk size of 4, this function will actually return 3 chunks
 * containing 3 items in each chunk.
 *
 * @author Sam Gardner-Dell
 * @param {Iterable} iterable the array to be chunked
 * @param {number} targetChunkSize the target chunk size
 * @returns {Array} an array of objects representing each chunk.  The object at each position of the array follows the
 * form:
 * {
 *      start: 0                           // (starting index within the source array)
 *      data: ['item, 'item', 'item']      // (data within this chunk)
 * }
 *
 */
module.exports.balanced = function (iterable, targetChunkSize) {
    const result = [];
    if (iterable !== null) {
        const array = Array.isArray(iterable) ? iterable : Array.from(iterable);
        const chunkSize = Number.isInteger(targetChunkSize) ? Math.max(2, targetChunkSize) : 2;
        let numberOfChunks = Math.ceil(array.length / Math.max(chunkSize, 1));

        for (let i = 0; i < array.length;) {
            const size = Math.ceil((array.length - i) / numberOfChunks--);
            result.push({
                start: i,
                data: array.slice(i, i += size)
            });
        }
    }
    return result;
};
