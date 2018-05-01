/* eslint no-unused-expressions: "off" */
'use strict';
const Lab = require('lab');
const lab = exports.lab = Lab.script();
const expect = Lab.assertions.expect;
// const assert = Lab.assertions.assert;
const describe = lab.describe;
const it = lab.it;
const chunker = require('../../../app/lib/array/chunker');

const testChunkedArray = function (chunkedArray, flatArray, expectedChunkSizes) {
    const chunkSizes = chunkedArray.map(chunk => chunk.data.length);
    // The sum of the lengths of all nested arrays within the chunked array should match the flat array length
    expect(chunkSizes.reduce((a, b) => a + b, 0)).to.equal(flatArray.length);

    if (Array.isArray(expectedChunkSizes)) {
        expect(chunkSizes).to.deep.equal(expectedChunkSizes);
    }
};
const generateArray = function (length) {
    const result = [];
    for (let i = 0; i < length; i++) {
        result.push(`Item ${i}`);
    }
    return result;
};

describe('chunker', () => {
    it('should be able to handle an empty array', (done) => {
        const input = [];
        const result = chunker.balanced(input, 2);
        testChunkedArray(result, input);
        done();
    });
    it('should force a minimum chunk size of two', (done) => {
        const input = generateArray(3);
        const result = chunker.balanced(input, 1);
        // First chunk should be 2 elements, second chunk should have only 1
        testChunkedArray(result, input, [2, 1]);
        done();
    });

    it('should default to a chunk size of two when not supplied with a valid chunk size', (done) => {
        const input = generateArray(3);
        const result = chunker.balanced(input, 'four');
        // First chunk should be 2 elements, second chunk should have only 1
        testChunkedArray(result, input, [2, 1]);
        done();
    });

    it('should return an empty array for invalid input', (done) => {
        const result = chunker.balanced(null, 2);
        expect(result).to.be.empty;
        done();
    });

    it('should return an empty array for non-array input', (done) => {
        const input = 'a string';
        const result = chunker.balanced(input, 2);
        testChunkedArray(result, input, [2, 2, 2, 2]);
        done();
    });

    it('should handle target chunk size larger than input array', (done) => {
        const input = generateArray(7);
        const result = chunker.balanced(input, 13);
        testChunkedArray(result, input, [7]);
        done();
    });

    it('should create chunks balanced as near to the target size as possible', (done) => {
        const input = generateArray(25);
        const result = chunker.balanced(input, 4);
        testChunkedArray(result, input, [4, 4, 4, 4, 3, 3, 3]);
        done();
    });

    it('should create chunks as near to the target size as possible', (done) => {
        const input = generateArray(23);
        const result = chunker.balanced(input, 13);
        testChunkedArray(result, input, [12, 11]);
        done();
    });

    it('should assign chunks as evenly as possible', (done) => {
        const input = generateArray(9);
        const result = chunker.balanced(input, 4);
        testChunkedArray(result, input, [3, 3, 3]);
        done();
    });
    it('should assign chunks as evenly as possible for large arrays', (done) => {
        const input = generateArray(9000);
        const result = chunker.balanced(input, 400);
        testChunkedArray(result, input, [392, 392, 392, 392, 392, 392, 392, 391, 391, 391, 391, 391, 391, 391, 391, 391, 391, 391, 391, 391, 391, 391, 391]);
        done();
    });
});
