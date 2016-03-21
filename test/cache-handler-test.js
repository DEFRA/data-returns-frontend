
var cachehandler = require('../app/lib/cache-handler');
var Code = require('code');
var Lab = require('lab');
var lab = exports.lab = Lab.script();
var expect = Code.expect;

lab.test('Ping REDIS2', function (done) {

cachehandler.pingRedis()
  .then(function (result) {
    console.log('Result: ' + JSON.stringify(result));
    expect(result).toEqual('PONG');

    done();
  })
  .catch(function (rejectValue) {
    console.log('Error: ' + JSON.stringify(rejectValue));
    done();
  });

});



