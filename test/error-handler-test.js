var Code = require('code');
var Lab = require('lab');
var lab = exports.lab = Lab.script();
var expect = Code.expect;
var errorHandler = require('../app/lib/error-handler');
var utils = require('../app/lib/utils');
var path = require('path');
var templateDir = path.resolve(__dirname, '../app/error-templates/');
var filenames = utils.getFileListInDir(templateDir);

var errCode;

lab.experiment('error-handler.js library', function () {

    filenames.forEach(function (filename) {
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
    });
});