var Code = require('code');
var Lab = require('lab');
var lab = exports.lab = Lab.script();
var expect = Code.expect;
var errorHandler = require('../app/lib/error-handler');
var path = require('path');
var templateDir = path.resolve(__dirname, '../app/error-templates/');
const klaw = require("klaw");

var errCode;

lab.experiment('error-handler.js library', function () {
    klaw(templateDir).on('data', function (item) {
        if (item.stats.isFile()) {
            let filename = item.path;
            lab.test('Test render ' + filename, function (done) {
                var f = filename.split('/');
                var s = f.length;

                errCode = f[s - 1];

                if (errCode.indexOf('DR0') !== -1) {
                    errCode = errCode.replace('DR0', '');
                } else {
                    errCode = filename.replace('DR', '');
                }

                errCode = errCode.replace('.html', '');

                var message = errorHandler.render(errCode, {}, 'default error message');
                if (message) {
                    expect(message).to.be.a.String;
                    done();
                }
            });
        }
    });
});