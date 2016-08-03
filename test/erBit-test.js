var Code = require('code');
var Lab = require('lab');
var lab = exports.lab = Lab.script();
var expect = Code.expect;
var errbitErrorMessage = require('../app/lib/errbitErrorMessage');


lab.experiment('errbitErrorMessage.js library', function () {

    lab.test('Create errBit Message', function (done) {

        var msg = new errbitErrorMessage.errBitMessage('test message', 'testfile', 'testmethod', 10);

        if (msg) {
            expect(msg).to.be.an.Object;
            expect(msg.message).to.equal('test message');
            expect(msg.fileName).to.equal('testfile');
            expect(msg.method).to.equal('testmethod');
            expect(msg.lineNumber).to.equal(10);
            done();
        }


    });


});
