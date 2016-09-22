"use strict";
var createDescription = function (code, description, explanation) {
    return {
        "code": code,
        "description": description,
        "explanation": explanation
    };
};

let errorCodes = [];
const UNKNOWN = createDescription(null, "Unrecognised error", "");
errorCodes["400"] = createDescription(400, "File error", "Your file isn’t saved as CSV");
errorCodes["450"] = createDescription(450, "File error", "There’s a problem with your CSV file");
errorCodes["500"] = createDescription(500, "File error", "Your file is empty");
errorCodes["550"] = createDescription(550, "File error", "Your file is too large");
errorCodes["600"] = createDescription(600, "File error", "Your file is unsafe");
errorCodes["820"] = createDescription(820, "File error", "Your data return is incomplete (missing fields)");
errorCodes["840"] = createDescription(840, "File error", "Your file contains unrecognisable field headings");
errorCodes["900"] = createDescription(900, "Data error", "Your data return contains errors that must be corrected");
errorCodes["3000"] = createDescription(3000, "Unexpected failure", "There was a problem with the service. Details of the problem have been recorded. This problem may be temporary.");

module.exports = {
    getDefinition: function (errorCode) {
        return errorCodes[errorCode] || UNKNOWN;
    }
};
