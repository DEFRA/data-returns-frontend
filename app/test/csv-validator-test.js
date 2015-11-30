/*
 * Unit tests for the csv-validator.js file
 * Uses the Lab test utility https://github.com/hapijs/lab
 * with the https://github.com/hapijs/code assertion library
 */

'USE STRICT';

var csvValidator = require('../lib/csv-validator.js');
var fs = require('fs');
var Code = require('code');
var Lab = require('lab');
var lab = exports.lab = Lab.script();
var file, filePath, fileparts, stats;
var isTestDocsAvailable = true;

var testConfig = [
	{title: 'CSV Validator Test 1 - A file without a .csv extention',
		testfilepath: __dirname + '/../../uploads/to_upload/NotCSV.txt',
		expectError: true
	},
	{title: 'CSV Validator Test 2 - An empty File',
		testfilepath: __dirname + '/../../uploads/to_upload/empty.csv',
		expectError: true
	},
	{title: 'CSV Validator Test 3 - A valid File',
		testfilepath: __dirname + '/../../uploads/to_upload/success.csv',
		expectError: false
	}
];

/*Check we have the test documents */
testConfig.forEach(function (item) {
	if (!fs.existsSync(item.testfilepath)) {
		isTestDocsAvailable = false;
	}
});

if (isTestDocsAvailable === true) {
	testConfig.forEach(function (item) {

		lab.test(item.title, function (done) {

			filePath = item.testfilepath;
			fileparts = filePath.split('.');
			file = fs.createReadStream(filePath);
			stats = fs.statSync(filePath);
			file.size = stats['size'];
			file.extension = fileparts[fileparts.length - 1];

			csvValidator.isValidCSV(file, function (err, result) {
				if (item.expectError === true) {
					/* expect an error */
					Code.expect(err).to.not.equal(null);
					/* always expect a result */
					Code.expect(result).to.not.equal(null);
				} else {
					/* expect no errors */
					Code.expect(err).to.equal(null);
					/* always expect a result */
					Code.expect(result).to.not.equal(null);
				}
				done();
			});

		});

	});

} else {
	console.log('One or all of the test documents are missing, unable to test!');
}


