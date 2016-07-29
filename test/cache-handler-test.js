var cachehandler = require('../app/lib/cache-handler');
var code = require('code');
var Lab = require('lab');
var lab = exports.lab = Lab.script();
var expect = code.expect;
var testKey = 'data-returns-test-key';
var testValue = 'Data Returns test value';


/*
 * Test if we can write to REDIS
 */
lab.test('REDIS setValue()', function (done) {

    cachehandler.setValue(testKey, testValue)
        .then(function (result) {
            expect(result).to.equal(true);
            done();
        })
        .catch(function (e) {
            console.log('Error: ' + JSON.stringify(e));
            done();
        });

});

lab.test('REDIS persistValue()', function (done) {

    cachehandler.setPersistedValue('persisted-testKey', testValue)
        .then(function (result) {
            expect(result).to.equal(true);
            done();
        })
        .catch(function (e) {
            console.log('Error: ' + JSON.stringify(e));
            done();
        });

});

/*
 * Test if we can delete a key
 */
lab.test('REDIS delete()', function (done) {

    cachehandler.delete('persisted-testKey')
        .then(function (result) {
            expect(result).to.equal(true);
            done();
        })
        .catch(function (e) {
            console.log('Error: ' + JSON.stringify(e));
            done();
        });

});


/*
 * Test if we can read from REDIS
 */
lab.test('REDIS getValue()', function (done) {
    cachehandler.getValue(testKey)
        .then(function (result) {

            expect(result.replace(/"/g, '')).to.equal(testValue);
            done();

        })
        .catch(function (e) {
            console.log('Error: ' + JSON.stringify(e));
            done();
        });

});
