"use strict";
/*
 * Helper module to help handle multiple errors returned from the backend API
 */
const lodash = require('lodash');
const winston = require("winston");
const helpLinks = require('../config/dep-help-links');

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

let getErrorTypeInfo = function (key) {
    let lookup = key.toLowerCase();
    return errorTypeInfo[lookup];
};

/**
 * Given an array of integers, this method returns a String representation of the array having collapsed sequences
 * of numbers into a range.  E.g. given the array [1, 2, 3, 5, 6, 7, 10, 12] this method shall return "1-3, 5-7, 10, 12"
 *
 * @param intArray the array of integers to bne processed
 * @returns {string} the string representation of the array.
 */
let collapseArrayRanges = function (intArray) {
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

/**
 * Helper function - currently the front-end does not support multi-object validation messages
 * @param fieldData
 * @returns Object The display field and value
 */
let errorDataHelper = function (fieldData) {
    if (fieldData && Array.isArray(fieldData) && fieldData.length > 0) {
        let fieldNameArr = fieldData.map(i => i.name);
        // fieldName will be a comma separated list of field headings
        let fieldName = fieldNameArr.join(", ");
        // fieldHeadingText will be a natural language "Field1, Field2 and Field3" string for use in sentences
        let fieldHeadingText = fieldName.replace(/,(?!.*,)/gmi, ' and');
        let values = fieldData.length > 1 ? fieldData.map(i => `${i.name}: ${i.value || ''}`).join(", ") : fieldData[0].value;
        return {fieldName: fieldName, fieldHeadingText: fieldHeadingText, errorValue: values};
    } else {
        return {fieldName: null, fieldHeadingText: null, errorValue: null};
    }
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
        let sortedData = lodash.sortBy(data, ["errorCode", "errorType"]);

        let correctionTableData = [];
        let lastTableItem = null;
        for (let dataItem of sortedData) {
            let tableItem = null;

            if (lastTableItem === null || lastTableItem.errorCode !== dataItem.errorCode) {
                // Create a new display item for the current error
                tableItem = {
                    "errorCode": dataItem.errorCode
                };
                correctionTableData.push(tableItem);
            } else {
                // Get last item encountered
                tableItem = correctionTableData[correctionTableData.length - 1];
            }
            // Update the reference to the last displayed item
            lastTableItem = tableItem;

            // Record list of error types on the display item (e.g. Missing, Incorrect, Conflicting)
            tableItem.errorTypes = tableItem.errorTypes || [];
            tableItem.errorTypes.push(lodash.merge({key: dataItem.errorType, message: dataItem.errorMessage},
                getErrorTypeInfo(dataItem.errorType)));
            tableItem.errorTypes = lodash.uniqBy(tableItem.errorTypes, 'key');

            // Create a violations object to provide information for the correction detail page
            tableItem.violations = tableItem.violations || [];
            tableItem.violationCount = tableItem.violationCount || 0;
            let firstItem = true;

            // Sort instances by the first occurrence
            dataItem.instances = lodash.sortBy(dataItem.instances, (instance) => instance.recordIndices[0]);
            for (let violationInstance of dataItem.instances) {
                // Count the number of record indexes with this error
                tableItem.violationCount += violationInstance.recordIndices.length;

                // Violation information for the lower level corrections detail
                let errorData = errorDataHelper(violationInstance.fields);

                // Pull field name and text from the first available violation instance.
                tableItem.fieldName = tableItem.fieldName || errorData.fieldName;
                tableItem.fieldHeadingText = tableItem.fieldHeadingText || errorData.fieldHeadingText;
                tableItem.definition = helpLinks.links.fieldDefinitions[tableItem.fieldName];

                let violation = {
                    "errorType": dataItem.errorType,
                    "errorTypeInfo": getErrorTypeInfo(dataItem.errorType),
                    "rows": collapseArrayRanges(violationInstance.recordIndices.map(r => r + 2)),
                    "errorValue": errorData.errorValue,
                };
                if (firstItem) {
                    violation.anchor = dataItem.errorType;
                    firstItem = false;
                }
                tableItem.violations.push(violation);
            }
            tableItem.multipleViolations = tableItem.violationCount > 1;
        }
        return correctionTableData;
    }
};