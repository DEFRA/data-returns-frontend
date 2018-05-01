/* eslint no-unused-expressions: "off" */
'use strict';
const Lab = require('lab');
const lab = exports.lab = Lab.script();
const expect = Lab.assertions.expect;
// const assert = Lab.assertions.assert;
const describe = lab.describe;
const it = lab.it;
const sequence = require('../../../app/lib/array/sequence');

describe('sequence.integerSequence', () => {
    it('should handle array without sequential ranges', (done) => {
        const input = [1, 3, 5, 7, 9];
        const result = sequence.integerSequence(input);
        expect(result).to.equal('1, 3, 5, 7, 9');
        done();
    });
    it('should handle array with 2 digit sequence', (done) => {
        const input = [1, 3, 5, 6, 9];
        const result = sequence.integerSequence(input);
        expect(result).to.equal('1, 3, 5-6, 9');
        done();
    });
    it('should handle array with multiple digit sequence', (done) => {
        const input = [1, 3, 5, 6, 7, 8, 9, 11];
        const result = sequence.integerSequence(input);
        expect(result).to.equal('1, 3, 5-9, 11');
        done();
    });
    it('should handle an unsorted array', (done) => {
        const input = [11, 9, 8, 7, 5, 6, 3, 1];
        const result = sequence.integerSequence(input);
        expect(result).to.equal('1, 3, 5-9, 11');
        done();
    });
    it('should handle array with sequence at start', (done) => {
        const input = [1, 2, 3, 5, 7, 9];
        const result = sequence.integerSequence(input);
        expect(result).to.equal('1-3, 5, 7, 9');
        done();
    });
    it('should handle array with sequence at end', (done) => {
        const input = [1, 3, 5, 7, 8, 9];
        const result = sequence.integerSequence(input);
        expect(result).to.equal('1, 3, 5, 7-9');
        done();
    });
});
describe('sequence.humanisedJoin', () => {
    it('should use \'and\' when no relationship given', (done) => {
        const input = ['apples', 'pairs', 'bananas'];
        const result = sequence.humanisedJoin(input);
        expect(result).to.equal('apples, pairs and bananas');
        done();
    });
    it('should use the given relationship', (done) => {
        const input = ['apples', 'pairs', 'bananas'];
        const result = sequence.humanisedJoin(input, 'or');
        expect(result).to.equal('apples, pairs or bananas');
        done();
    });
    it('should work for two terms', (done) => {
        const input = ['apples', 'pairs'];
        const result = sequence.humanisedJoin(input, 'or');
        expect(result).to.equal('apples or pairs');
        done();
    });
    it('should work for one term', (done) => {
        const input = ['apples'];
        const result = sequence.humanisedJoin(input, 'or');
        expect(result).to.equal('apples');
        done();
    });
});
