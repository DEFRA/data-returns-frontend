const winston = require("winston");
var Code = require('code');
var Lab = require('lab');
var lab = exports.lab = Lab.script();
var expect = Code.expect;

var fileUploadHandler = require('../app/api-handlers/file-upload-handler');
var fileName = 'success.csv';
var filePath = __dirname + '/data/' + fileName;
var sessionID = 'testsession';
var completionHandler = require('../app/api-handlers/completion-handler');
var testFileKey;
var testEmail = 'eanhathaway@gmail.com';
var controlledListsHandler = require('../app/api-handlers/controlled-lists');

lab.experiment('error-handler.js library', function () {

    lab.test('File upload test - good file', function (done) {

        fileUploadHandler.uploadFileToService(filePath, sessionID, fileName)
            .then(function (result) {
                testFileKey = result.uploadResult.fileKey;
                expect(result.uploadResult.fileName).to.equal(fileName);

                completionHandler.confirmFileSubmission(testFileKey, testEmail, fileName)
                    .then(function () {
                        done();
                    })
                    .catch(function (err) {
                        winston.error('Error' + JSON.stringify(err));
                        expect(err).to.be.an.Object;
                        done();
                    });
            })
            .catch(function (err) {
                winston.error('Error' + JSON.stringify(err));
                expect(err).to.be.an.Object;
                done();
            });
    });


    /*
     * send an empty file to api
     * should be rejected with 500 error code
     */
    lab.test('File upload test - empty file', function (done) {
        fileName = 'empty.csv';
        filePath = __dirname + '/data/' + fileName;
        fileUploadHandler.uploadFileToService(filePath, sessionID, fileName)
            .then(function (result) {
                expect(result.uploadResult.fileName).to.equal(fileName);
                done();
            })
            .catch(function (err) {
                //console.log('Error' + JSON.stringify(err));
                expect(err.isUserError).to.be.true;
                expect(err.errorCode).to.equal(500);
                done();
            });
    });

    /*
     * send a txt file to api
     * should be rejected with a 400 error code
     */
    lab.test('File upload test - empty file', function (done) {
        fileName = 'not_csv.txt';
        filePath = __dirname + '/data/' + fileName;
        fileUploadHandler.uploadFileToService(filePath, sessionID, fileName)
            .then(function (result) {
                expect(result.uploadResult.fileName).to.equal(fileName);
                done();
            })
            .catch(function (err) {
                //console.log('Error' + JSON.stringify(err));
                expect(err.isUserError).to.be.true;
                expect(err.errorCode).to.equal(400);
                done();
            });
    });

    /*
     * send a file with errors to the api
     * should be rejected with validation errors
     */
    lab.test('File upload test - empty file', function (done) {
        fileName = 'failures.csv';
        filePath = __dirname + '/data/' + fileName;
        fileUploadHandler.uploadFileToService(filePath, sessionID, fileName)
            .then(function (result) {
                expect(result.uploadResult.fileName).to.equal(fileName);
                done();
            })
            .catch(function (err) {
                //console.log('Error' + JSON.stringify(err));
                expect(err.isUserError).to.be.true;
                done();
            });
    });

    /*
     * Test for the controlled list metadata
     */
    lab.test('Controlled lists metadata test', function(done) {
        "use strict";
        controlledListsHandler.getListMetaData().then(function(result) {
            expect(typeof result === 'object').to.be.true;
            done();
        }).catch(function (err) {
            //console.log('Error' + JSON.stringify(err));
            expect(err.isUserError).to.be.true;
            done();
        });
    });

});