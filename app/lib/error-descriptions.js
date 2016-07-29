/**
 * Created by sam on 20/07/16.
 */
var createDescription = function (code, description) {
    return {
        "code": code,
        "description": description
    };
};

var errorCodes = [];
errorCodes["400"] = createDescription(400, "Your file isn’t saved as CSV");
errorCodes["450"] = createDescription(450, "There’s a problem with your CSV file");
errorCodes["500"] = createDescription(500, "Your file is empty");
errorCodes["550"] = createDescription(550, "Your file is too large");
errorCodes["600"] = createDescription(600, "Your file is unsafe");
errorCodes["820"] = createDescription(820, "Your data return is incomplete (missing fields)");
errorCodes["840"] = createDescription(840, "Your file contains unrecognisable field headings");
errorCodes["900"] = createDescription(900, "Multiple validation errors");
errorCodes["3000"] = createDescription(3000, "Unexpected processing failure");

module.exports = {
    getDescription: function (errorCode) {
        console.log("Retrieving description for error code " + errorCode);
        var desc = "Unrecognised error";
        if (errorCodes[errorCode]) {
            desc = errorCodes[errorCode].description;
        }
        console.log("Found description: (" + errorCode + ") " + desc);
        return desc;
    }
};