var pinhandler = require('../app/lib/pin-handler');
const config = require('../app/lib/configuration-handler.js').Configuration;
var Code = require('code');
var Lab = require('lab');
var lab = exports.lab = Lab.script();
var expect = Code.expect;
var maxdigits = config.get('pin.maxDigits');

/* Work out the maximum value expected for the number of digits required */
var maxvalue = '';
var x = maxdigits - 1;

do {
    maxvalue += 9;
} while (x--);

maxvalue = parseInt(maxvalue);

lab.test('Pin Generation Test', function (done) {
    pinhandler.newPin()
        .then(function (pin) {
            expect(pin).to.be.a.number();
            expect(pin).to.be.between(9, maxvalue);
            done();
        });
});






