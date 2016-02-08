
var pinhandler = require('../app/lib/pin-handler');
var config = require('../app/config/configuration_' + (process.env.NODE_ENV || 'local'));
const Code = require('code');
const Lab = require('lab');
const Path = require('path');
const lab = exports.lab = Lab.script();
const expect = Code.expect;
const maxdigits = config.pin.maxDigits;

/* Work out the maximum value expected for the number of digits required */
var maxvalue = "";
var i = 0;
var x = maxdigits - 1;

do {
    maxvalue += 9;
} while (x--)

maxvalue = parseInt(maxvalue);

lab.test('Pin Generation Test', function (done) {

pinhandler.newPin()
    .then(function (pin) {
        expect(pin).to.be.a.number();
        expect(pin).to.be.between(9, maxvalue);
        done();
    });
});






