/*
 * Helper module to help handle multiple errors returned from the backend API
 * 
 * 
 */
var uuid = require('node-uuid');
var cacheHandler = require('../lib/cache-handler');

module.exports = {
  /*
   * Groups error data by column name and error type, 
   * where error type is ether missing or incorrect
   * caches the grouped data in Redis for use in error detail pages
   */
  groupErrorData: function (data) {

    var groupedData = {};
    var groupLinkID = new Map();
    var errorPageData = [];

    //create linkid's for each group (used in html page links)
    data.forEach(function (item) {
      var columnName = item.columnName;
      var errorColumnText = item.errorValue === null ? 'Missing' : 'Incorrect';
      var groupkey = columnName + '_' + errorColumnText;
      var groupID = uuid.v4();
      groupLinkID.set(groupkey, groupID);
    });

    //create grouped data for the details page
    data.forEach(function (item) {

      var columnName = item.columnName;
      var errorColumnText = item.errorValue === null ? 'Missing' : 'Incorrect';
      var errorValue = item.errorValue;
      var rowNumber = item.outputLineNo;
      var errorMessage = item.outputMessage;
      var groupkey = columnName + '_' + errorColumnText;
      var group = groupedData[groupkey] || [];

      var temp = {
        rowNumber: rowNumber,
        columnName: columnName,
        errorValue: errorValue,
        errorColumnText: errorColumnText,
        errorMessage: errorMessage,
        groupID: groupLinkID.get(groupkey)
      };

      group.push(temp);

      // add this group to a container
      groupedData[groupkey] = group;
    });

    //save groups to redis for use later in details page
    for (var groupName in groupedData) {
      var groupID = groupLinkID.get(groupName);
      var group = groupedData[groupName];
      var firstErrorInGroup = group[0];

      errorPageData.push(firstErrorInGroup);

      (function (groupID, group) {
        cacheHandler.setValue('ErrorData_' + groupID, group)
          .then(function (result) {
            return;
          })
          .catch(function (err) {
            console.error(err);
          });
      })(groupID, group);
    }
    
    return errorPageData;
  }

};