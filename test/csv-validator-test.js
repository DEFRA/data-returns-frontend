'use strict';

/*
 * Unit tests for the csv-validator.js file
 * Uses the Lab test utility https://github.com/hapijs/lab
 * with the https://github.com/hapijs/code assertion library
 */

// Modules we depend on.
const CsvValidator = require('../app/lib/csv-validator.js');
const Code = require('code');
const Lab = require('lab');
const Path = require('path');
// Useful aliases for this test suite.
const lab = exports.lab = Lab.script();
const expect = Code.expect;
// Define the parameters of each test.
const testConfig = [
    {
        title: 'allows a valid CSV file',
        testFilePath: Path.join(__dirname, 'data/success.csv'),
        expectReject: false,
        expectedIsUserError: null,
        expectedMessage: null
    },
    {
        title: 'rejects a file if it cannot be found on disk',
        testFilePath: Path.join(__dirname, 'data/file_does_not_exist.csv'),
        expectReject: true,
        expectedIsUserError: false,
        expectedMessage: null
    },
    {
        title: 'rejects a file if the filename is null',
        testFilePath: null,
        expectReject: true,
        expectedIsUserError: false,
        expectedMessage: null
    },
    {
        title: 'rejects a file if the filename not a string',
        testFilePath: 123,
        expectReject: true,
        expectedIsUserError: false,
        expectedMessage: null
    },
    {
        title: 'rejects a file if the filename is empty',
        testFilePath: '',
        expectReject: true,
        expectedIsUserError: false,
        expectedMessage: null
    }
];

// Run each test in turn.
lab.experiment('csv-validator.js library', function () {
    testConfig.forEach(function (item) {
        lab.test(item.title, function (done) {
            CsvValidator.validateFile(item.testFilePath).then(function (resolveValue) {
                // Check that fulfillment was expected.
                expect(item.expectReject).to.be.false();
                expect(resolveValue).to.be.true();
                done();
            }).catch(function (rejectValue) {
                console.error(`csv-validator-test test failed: "${item.title}" with rejected value: ${rejectValue}`);
                // Check that rejection and "user / non-user" status is as expected.
                expect(item.expectReject).to.be.true();
                expect(rejectValue.isUserError).to.equal(item.expectedIsUserError);

                // If user error check that the error message is as expected,
                // otherwise check the rejection value contains an 'err' field.
                if (item.expectedIsUserError) {
                    expect(rejectValue.message).to.equal(item.expectedMessage);
                } else {
                    expect(rejectValue.err).to.be.instanceOf(Error);
                }
                done();
            });
        });
    });
});
