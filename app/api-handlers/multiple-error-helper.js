"use strict";
/*
 * Helper module to help handle multiple errors returned from the backend API
 */
const lodash = require('lodash');
var errorHandler = require('../lib/error-handler');

let errorTypeInfo = {
    "missing": {
        "order": 0,
        "name": "Missing",
        "message": "Your data is missing"
    },
    "length": {
        "order": 1,
        "name": "Length",
        "message": "Your data is too long"
    },
    "incorrect": {
        "order": 2,
        "name": "Incorrect",
        "message": "Your data is incorrect"
    },
    "conflict": {
        "order": 3,
        "name": "Conflicting",
        "message": "Your data is conflicting"
    }
};

let getErrorTypeInfo = function(key) {
    let lookup = new String(key).toLowerCase();
    return errorTypeInfo[lookup];
};

let collapseRows = function (violations) {
    let errors = lodash.sortBy(violations, ["errorType", "rowNumber"]);
    let rowsNumbersByErrorMap = new Map();

    for (let error of errors) {
        // The map key is the error type appended with the error value.  This way we only collapse rows which have the
        // same error value occurring more than once
        let mapKey = `${error.errorType}_${error.errorValue}`;

        let errorData = rowsNumbersByErrorMap.get(mapKey) || {
            "errorType": error.errorType,
            "errorTypeInfo": getErrorTypeInfo(error.errorType),
            "errorValue": error.errorValue,
            "rows": new Array()
        };
        errorData.rows.push(error.rowNumber);
        rowsNumbersByErrorMap.set(mapKey, errorData);
    }

    let outputRowErrors = new Array();
    let lastErrorType = null;
    rowsNumbersByErrorMap.forEach(function(errorData) {
        errorData.rows = collapseArrayRanges(errorData.rows);
        if (lastErrorType !== errorData.errorType)  {
            // If this is the first instance of a new error type we need to insert an anchor for linking
            errorData.anchor = errorData.errorType;
            lastErrorType = errorData.errorType;
        }
        outputRowErrors.push(errorData);
    });
    return outputRowErrors;
};

/**
 * Given an array of integers, this method returns a String representation of the array having collapsed sequences
 * of numbers into a range.  E.g. given the array [1, 2, 3, 5, 6, 7, 10, 12] this method shall return "1-3, 5-7, 10, 12"
 *
 * @param intArray the array of integers to bne processed
 * @returns {string} the string representation of the array.
 */
var collapseArrayRanges = function (intArray) {
    let listing = [];
    let start;
    intArray.forEach((currentInt, index) => {
        const previousFilled = intArray[index - 1] === (currentInt - 1);
        const nextFilled = intArray[index + 1] === (currentInt + 1);

        // Next item is empty, and previous was filled, so add range listing
        if (!nextFilled && previousFilled) {
            return listing.push(`${start}-${currentInt}`);
        }

        if (!previousFilled) {
            // Next is empty, so this is a single listing
            if (!nextFilled) {
                listing.push(currentInt);
            }
            start = currentInt;
        }
    });
    return listing.join(', ');
};


module.exports = {
    /**
     * Transform the backend error structure into a structure we can use to display data on the corrections table
     * and the corrections detail pages.
     *
     * This method processes each error returned by the backend and groups them based on the errorCode.  For each
     * top level item an array of row errors is created to provide the information necessary for the corrections
     * detail pages.
     *
     * @param data
     * @returns {Array}
     */
    groupErrorData: function (data) {
        // The backend may return multiple violations for a single field (e.g. permit format invalid and also
        // not a controlled list item) so collapse these down so as not to confuse the output in the table
        let uniqueErrors = lodash.uniqWith(data, lodash.isEqual);
        // Sort by error code (field) and error type (invalid, missing, etc)
        let sortedData = lodash.sortBy(uniqueErrors, ["errorCode", "errorType"]);

        let correctionTableData = new Array();
        let lastTableItem = null;
        for (let item of sortedData) {
            let tableItem = null;

            if (lastTableItem === null || lastTableItem.errorCode !== item.errorCode) {
                // Create a new display item for the current error code
                tableItem = {
                    "fieldName": item.fieldName || "Multiple",
                    "fieldHeadingText": item.fieldName || "multiple",
                    "errorCode": item.errorCode,
                    "definition": item.definition
                };
                correctionTableData.push(tableItem);
            } else {
                // Get last item encountered
                tableItem = correctionTableData[correctionTableData.length - 1];
            }

            // Record of list or error types on the display item (e.g. Missing, Incorrect, Conflicting)
            if (!Array.isArray(tableItem.errorTypes)) {
                tableItem.errorTypes = new Array();
            }
            tableItem.errorTypes.push(lodash.merge({
                key: item.errorType,
                message: item.errorMessage
            }, getErrorTypeInfo(item.errorType)));

            // Create a violations object to provide information for the correction detail page
            if (!Array.isArray(tableItem.violations)) {
                tableItem.violations = new Array();
            }


            // Violation information for the lower level corrections detail
            let violation = {
                "errorType": item.errorType,
                "errorTypeInfo": getErrorTypeInfo(item.errorType),
                "rowNumber": item.lineNumber,
                "errorValue": item.errorValue
            };
            tableItem.violations.push(violation);

            // Update the reference to the last displayed item
            lastTableItem = tableItem;
        }

        for (let item of correctionTableData) {
            // Add details of violations to the to level correct table items
            item.violationCount = item.violations.length;
            item.multipleViolations = item.violations.length > 1;
            item.violations = collapseRows(item.violations);
            item.errorTypes = lodash.uniqWith(item.errorTypes, lodash.isEqual);
            item.correction = "";
            // Render correction message for each type of violation reported by the backend.
            for (let type of item.errorTypes) {
                item.correction += errorHandler.renderCorrectionMessage(item.errorCode, type.name, {}, type.message);
            }
            // Render more help for use in the correction table
            item.correction += errorHandler.renderCorrectionMessage(item.errorCode, "MoreHelp", {});
        }
        return correctionTableData;
    }
};