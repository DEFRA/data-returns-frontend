
var cachehandler = require('../app/lib/cache-handler');
var Code = require('code');
var Lab = require('lab');
var Path = require('path');
var lab = exports.lab = Lab.script();
var expect = Code.expect;

var testkey = 'testkey';
var testvalue = 'test value';



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



