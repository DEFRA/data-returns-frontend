'use strict';
/**
 * Given an array of integers, this method returns a String representation of the array having collapsed sequences
 * of numbers into a range.  E.g. given the array [1, 2, 3, 5, 6, 7, 10, 12] this method shall return "1-3, 5-7, 10, 12"
 *
 * @param {Array} intArray the array of integers to be processed
 * @returns {string} the string representation of the array.
 */
module.exports.integerSequence = function (intArray) {
    const listing = [];
    let start;
    const sortedArr = intArray.sort((a, b) => a - b);

    sortedArr.forEach((currentInt, index) => {
        const previousIsSequential = intArray[index - 1] === (currentInt - 1);
        const nextIsSequential = intArray[index + 1] === (currentInt + 1);

        // Next item is empty, and previous was filled, so add range listing
        if (!nextIsSequential && previousIsSequential) {
            return listing.push(`${start}-${currentInt}`);
        }

        if (!previousIsSequential) {
            // Next is empty, so this is a single listing
            if (!nextIsSequential) {
                listing.push(currentInt);
            }
            start = currentInt;
        }
    });
    return listing.join(', ');
};

/**
 * Given an array of values this method returns a String representation suitable for consumption by humans.
 *
 * E.g. given the array ['apples', 'pairs', 'bananas]
 *  - humanisedJoin(arr, 'and') would result in 'apples, pairs and bananas'
 *  - humanisedJoin(arr, 'or') would result in 'apples, pairs or bananas'
 *
 * @param {Array} arr the array of strings to be joined
 * @param {string} relationship the relationship between the elements, used between the last 2 items in the array, e.g. 'and', 'or', 'nor'.  defaults to 'and'
 * @returns {string} a humanised representation of the array.
 */
module.exports.humanisedJoin = function (arr, relationship) {
    const rel = ` ${relationship ? relationship.trim() : 'and'} `;
    let txt = '';
    for (let i = 0; i < arr.length; i++) {
        txt += arr[i];
        if (i < arr.length - 1) {
            txt += (i < arr.length - 2) ? ', ' : rel;
        }
    }
    return txt;
};
