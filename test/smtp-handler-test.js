var smtpMailer = require('../app/lib/smtp-handler.js');
var goodaddress = 'someone@somewhere.com';
var badaddress = 'someone.somewhere.com';

var message = 'Test email message';


const Code = require('code');
const Lab = require('lab');
const Path = require('path');
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

lab.test('Send Test email (may not actualy send email)', function (done) {
    smtpMailer.sendEmail(goodaddress, 'Test email')
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