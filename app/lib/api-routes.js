
var BASEURL = {
	PROTOCOL: 'http://',
	SERVER: 'localhost:',
	PORT: 9020
};

module.exports.routing = {
	'FILEUPLOAD': BASEURL.PROTOCOL + BASEURL.SERVER + BASEURL.PORT + '/data-exchange/upload',
	'FILEUPLOADVALIDATE': BASEURL.PROTOCOL + BASEURL.SERVER + BASEURL.PORT + '/data-exchange/validate',
	'FILEUPLOADSEND': BASEURL.PROTOCOL + BASEURL.SERVER + BASEURL.PORT + '/data-exchange/complete',
	'ERRORCHECKING': 'error_checking',
	'ERRORSENDING': 'error_sending'
};

module.exports.STATUS_CODES = {
	OK: 200
};