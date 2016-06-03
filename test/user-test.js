var Code = require('code');
var Lab = require('lab');
var lab = exports.lab = Lab.script();
var expect = Code.expect;
var userHandler = require('../app/lib/user-handler');

lab.experiment('userhandler.js library', function () {


  lab.test('Test user creation', function (done) {

    var datenow = new Date();

    var user = {
      authenticated: false,
      email: 'testemail@somewhere.com',
      pin: 1960,
      pinCreationTime: datenow.toUTCString(),
      uploadCount: 0
    };

    userHandler.setUser('testsession', user)
    .then(function (result) {
      if (result) {
        expect(result).to.be.equal('OK');
        done();
      }

    })
    .catch(function (err) {

      if (err) {

        done();
      }

    });


  });


});