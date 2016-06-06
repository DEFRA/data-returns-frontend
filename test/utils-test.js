

var Code = require('code');
var Lab = require('lab');
var lab = exports.lab = Lab.script();
var expect = Code.expect;
var path = require('path');
var templateDir = path.resolve(__dirname, '../app/error-templates/');
var utils = require('../app/lib/utils');



//var templateDir = path.resolve(__dirname, '../app/error-templates/');
//var filenames = utils.getFileListInDir(templateDir);


lab.experiment('error-handler.js library', function () {
  lab.test('Test that error messages can be rendered ', function (done) {
    var filenames = utils.getFileListInDir(templateDir);

    if (filenames) {
      expect(filenames).to.be.an.Array;
      done();
    }
  });
});



