/* eslint no-unused-expressions: "off" */
const Code = require('code');
const Lab = require('lab');
const lab = exports.lab = Lab.script();
const expect = Code.expect;
const errorHandler = require('../app/lib/error-handler');
const path = require('path');
const templateDir = path.resolve(__dirname, '../app/error-templates/');
const klaw = require('klaw');

let errCode;

lab.experiment('error-handler.js library', function () {
    klaw(templateDir).on('data', function (item) {
        if (item.stats.isFile()) {
            const filename = item.path;
            lab.test('Test render ' + filename, function (done) {
                const f = filename.split('/');
                const s = f.length;

                errCode = f[s - 1];

                if (errCode.indexOf('DR0') !== -1) {
                    errCode = errCode.replace('DR0', '');
                } else {
                    errCode = filename.replace('DR', '');
                }

                errCode = errCode.replace('.html', '');

                const message = errorHandler.render(errCode, {}, 'default error message');
                if (message) {
                    expect(message).to.be.a.String;
                    done();
                }
            });
        }
    });
});
