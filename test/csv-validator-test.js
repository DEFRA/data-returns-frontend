'use strict';

/*
 * Unit tests for the csv-validator.js file
 * Uses the Lab test utility https://github.com/hapijs/lab
 * with the https://github.com/hapijs/code assertion library
 */

// Modules we depend on.
const CsvValidator = require('../app/lib/csv-validator.js');
const ErrorMessages = require('../app/lib/error-messages.js');
const Code = require('code');
const Lab = require('lab');
const Path = require('path');

// Useful aliases for this test suite.
const lab = exports.lab = Lab.script();
const expect = Code.expect;

// Useful constants for this test suite.
const correctContentType = 'text/csv';
const badContentType = 'application/octet-stream';

// Define the parameters of each test.
var testConfig = [
    {
        title: 'allows a valid CSV file if the content-type is correct',
        testFilePath: Path.join(__dirname, 'data/success.csv'),
        testContentType: correctContentType,
        expectReject: false,
        expectedIsUserError: null,
        expectedMessage: null
    },
    {

        title: 'allows a valid CSV file even if the content-type is wrong',
        testFilePath: Path.join(__dirname, 'data/success.csv'),
        testContentType: badContentType,
        expectReject: false,
        expectedIsUserError: null,
        expectedMessage: null
=======
        title: 'rejects a valid CSV file if the content-type is wrong',
        testFilePath: Path.join(__dirname, 'data/success.csv'),
        testContentType: badContentType,
        expectReject: true,
        expectedIsUserError: true,
        expectedMessage: ErrorMessages.FILE_HANDLER.INVALID_CONTENT_TYPE

    },
    {
        title: 'rejects a valid CSV file if the content-type is null',
        testFilePath: Path.join(__dirname, 'data/success.csv'),
        testContentType: null,
        expectReject: true,
        expectedIsUserError: false,
        expectedMessage: null
    },
    {
        title: 'rejects a valid CSV file if the content-type is not a string',
        testFilePath: Path.join(__dirname, 'data/success.csv'),
        testContentType: 123,
        expectReject: true,
        expectedIsUserError: false,
        expectedMessage: null
    },
    {
        title: 'rejects a valid CSV file if the content-type is an empty string',
        testFilePath: Path.join(__dirname, 'data/success.csv'),
        testContentType: '',
        expectReject: true,
        expectedIsUserError: false,
        expectedMessage: null
    },
    {
        title: 'rejects an empty file (with correct content type)',
        testFilePath: Path.join(__dirname, 'data/empty.csv'),
        testContentType: correctContentType,
        expectReject: true,
        expectedIsUserError: true,
        expectedMessage: ErrorMessages.FILE_HANDLER.ZERO_BYTES
    },
    {
        title: 'rejects a file with the wrong extension (with correct content type)',
        testFilePath: Path.join(__dirname, 'data/not_csv.txt'),
        testContentType: correctContentType,
        expectReject: true,
        expectedIsUserError: true,
        expectedMessage: ErrorMessages.FILE_HANDLER.NOT_CSV
    },
    {
        title: 'rejects a file if it cannot be found on disk',
        testFilePath: Path.join(__dirname, 'data/file_does_not_exist.csv'),
        testContentType: correctContentType,
        expectReject: true,
        expectedIsUserError: false,
        expectedMessage: null
    },
    {
        title: 'rejects a file if the filename is null',
        testFilePath: null,
        testContentType: correctContentType,
        expectReject: true,
        expectedIsUserError: false,
        expectedMessage: null
    },
    {
        title: 'rejects a file if the filename not a string',
        testFilePath: 123,
        testContentType: correctContentType,
        expectReject: true,
        expectedIsUserError: false,
        expectedMessage: null
    },
    {
        title: 'rejects a file if the filename is empty',
        testFilePath: '',
        testContentType: correctContentType,
        expectReject: true,
        expectedIsUserError: false,
        expectedMessage: null
    }
];

// Run each test in turn.
lab.experiment('csv-validator.js library', function() {
    testConfig.forEach(function (item) {
        lab.test(item.title, function (done) {
            CsvValidator.validateFile(item.testFilePath, item.testContentType)
                .then(function (resolveValue) {
                    // Check that fulfillment was expected.
                    expect(item.expectReject).to.be.false();
                    expect(resolveValue).to.be.true();
                    done();
                }).catch(function (rejectValue) {
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