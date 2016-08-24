"use strict";
/*
 * Helper module to help handle multiple errors returned from the backend API
 */
const lodash = require('lodash');

let errorTypeInfo = {
    "missing": {
        "order": 0,
        "display": "Missing"
    },
    "length": {
        "order": 1,
        "display": "Incorrect"
    },
    "incorrect": {
        "order": 2,
        "display": "Incorrect"
    },
    "conflict": {
        "order": 3,
        "display": "Conflicting"
    }
};

let getCorrectionTableErrorText = function(errorTypesArr) {
    let sortedTypes = lodash.sortBy(lodash.uniq(errorTypesArr), function(item) {
        let lookup = new String(item).toLowerCase();
        return errorTypeInfo[lookup].order;
    });
    let displayText = "";
    sortedTypes.forEach((text, index) => {
        if (index > 0) {
            let sep = ", ";
            if (index === sortedTypes.length - 1) sep = " and ";
            displayText += sep;
        }
        displayText += text;
    });
    return displayText;
};

let getErrorMessageForKey = function (key) {
    let lookup = new String(key).toLowerCase();
    return errorTypeInfo[lookup].display;
};

let collapseRows = function (rowErrors) {
    let errors = lodash.sortBy(rowErrors, ["errorType", "lineNumber"]);
    let rowsNumbersByError = new Map();
    let outputRowErrors = new Array();

    for (let error of errors) {
        let rowNumberArrayForType = rowsNumbersByError.get(error.errorText);
        if (!Array.isArray(rowNumberArrayForType)) {
            rowNumberArrayForType = new Array();
        }
        rowNumberArrayForType.push(error.lineNumber);
        rowsNumbersByError.set(error.errorText, rowNumberArrayForType);
    }

    rowsNumbersByError.forEach(function(valRowNumbers, keyErrorText) {
        outputRowErrors.push({
            "errorText": keyErrorText,
            "rowText": collapseArrayRanges(valRowNumbers)
        });
    });
    return outputRowErrors;
};


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
     * Transform the backend error stucture into a structure we can use to display data on the corrections table
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
        let sortedData = lodash.sortBy(data, ["errorCode", "errorType"]);

        let displayData = new Array();
        let lastDisplayItem = null;
        for (let item of sortedData) {
            let displayItem = null;

            if (lastDisplayItem === null || lastDisplayItem.errorCode !== item.errorCode) {
                // Create a new display item for the current error code
                displayItem = lodash.cloneDeep(item);
                displayData.push(displayItem);
            } else {
                // Get last item encountered
                displayItem = displayData[displayData.length - 1];
            }

            // Record of list or error types on the display item (e.g. Missing, Incorrect, Conflicting)
            if (!Array.isArray(displayItem.errorTypesArr)) {
                displayItem.errorTypesArr = new Array();
            }
            displayItem.errorTypesArr.push(item.errorType);

            // Create a rowErrors object to provide information for the correction detail page
            if (!Array.isArray(displayItem.rowErrors)) {
                displayItem.rowErrors = new Array();
            }

            // If item was invalid then display the invalid value, otherwise display the reason the item failed validation
            let errorText = item.errorValue;
            if ("incorrect" !== item.errorType.toLowerCase()) {
                errorText = getErrorMessageForKey(item.errorType);
            }

            displayItem.rowErrors.push({
                "errorText":  errorText,
                "rowText": item.lineNumber,
                "errorType": item.errorType,
                "lineNumber": item.lineNumber
            });

            // Update the reference to the last displayed item
            lastDisplayItem = displayItem;
        }

        displayData.forEach(function(item) {
            // Tidy up the top level details which are displayed in the corrections table
            item.fieldName = item.fieldName || "(Multiple)";
            item.errorType = getCorrectionTableErrorText(item.errorTypesArr);
            item.rowErrors = collapseRows(item.rowErrors);

            // These fields are no longer required on the top level objects as the detail is recorded in the rowErrors
            // property at the lower level (to be displayed on the corrections detail page)
            delete item.errorTypesArr;
            delete item.lineNumber;

        });
        return displayData;
    }
};