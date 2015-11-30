
'USE STRICT';

var callbackHandler = require(__dirname + '/api-callback-handler.js');
var fs = require('fs');
var apiRoutes = require(__dirname + '/api-routes.js');
var csvValidator = require(__dirname + '/csv-validator.js');


var uploadToAPI = function (request, thisFile, isCheckingOnly, callback) {

	var formData = {
		fileUpload: fs.createReadStream(thisFile.path)
	};

	var url = apiRoutes.routing.FILEUPLOAD;
	// Pass on file to data exchange
	request.post({
		url: url,
		formData: formData
	}, function (err, httpResponse, body) {
		var stage = 'upload';
		var responseCode = httpResponse ? httpResponse.statusCode : null;

		callbackHandler.processCallback(stage, isCheckingOnly, err, responseCode, body, function (data) {

			callback(data);

		});

	});
};

module.exports.processUploadedFiles = function (request, files, isCheckingOnly, callback) {

	for (var file in files) {
		var thisFile = files[file];

		if (thisFile.uploadComplete) {
			thisFile.checking_only = isCheckingOnly;

			csvValidator.isValidCSV(thisFile, function (err, result) {

				if (err) {
					console.log(err);
					var data = {
						route: apiRoutes.routing.ERRORSENDING,
						result: result
					};

					callback(err, data);

				} else {

					uploadToAPI(request, thisFile, isCheckingOnly, function (data) {
						callback(null, data);
					});

				}

			});
		}

	}

};








