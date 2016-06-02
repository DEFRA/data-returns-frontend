var smtpMailer = require('../app/lib/smtp-handler.js');
var goodaddress = 'someone@somewhere.com';
var Code = require('code');
var Lab = require('lab');
var lab = exports.lab = Lab.script();
var expect = Code.expect;


lab.test('Good email address ', function (done) {
    smtpMailer.validateEmailAddress(goodaddress)
        .then(function (result) {
            expect(result).to.be.true;
            done();
        })
        .catch(function (errorData) {
            if (errorData) {
                expect(errorData).to.be.an.Object;
                done();
            }
        });

});

lab.test('Bad email address', function (done) {
    smtpMailer.validateEmailAddress(goodaddress)
        .then(function (result) {
            expect(result).to.be.false;
            done();
        })
        .catch(function (errorData) {
            if (errorData) {
                expect(errorData).to.be.an.Object;
                done();
            }
        });

});