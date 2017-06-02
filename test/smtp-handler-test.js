/* eslint no-unused-expressions: "off" */

const smtpMailer = require('../app/lib/smtp-handler.js');
const goodaddress = 'someone@somewhere.com';
const Code = require('code');
const Lab = require('lab');
const lab = exports.lab = Lab.script();
const expect = Code.expect;

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
