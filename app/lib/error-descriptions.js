'use strict';
const errorCodes = [];

const addErrorCode = function (code, description, explanation) {
    const entry = {
        'code': code,
        'description': description,
        'explanation': explanation
    };
    errorCodes[code] = entry;
    return entry;
};

const UNKNOWN = addErrorCode(null, 'Unrecognised error', '');
addErrorCode(400, 'File error', 'Your file isn’t saved as CSV');
addErrorCode(450, 'File error', 'There’s a problem with your CSV file');
addErrorCode(500, 'File error', 'Your file is empty');
addErrorCode(550, 'File error', 'Your file is too large');
addErrorCode(600, 'File error', 'Your file is unsafe');
addErrorCode(820, 'File error', 'Your file is incomplete (missing fields)');
addErrorCode(840, 'File error', 'Your file contains unrecognisable column headings');
addErrorCode(860, 'File error', 'Your file contains duplicate column headings');
addErrorCode(880, 'File error', "Your file doesn't contain any data");
addErrorCode(900, 'Data error', 'Your file contains errors that must be corrected');
addErrorCode(3000, 'Unexpected failure', 'There was a problem with the service. Details of the problem have been recorded. This problem may be temporary.');

module.exports = {
    getDefinition: function (errorCode) {
        return errorCodes[errorCode] || UNKNOWN;
    }
};
