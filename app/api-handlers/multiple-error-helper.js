
var uuid = require('node-uuid');
var cacheHandler = require('../lib/cache-handler');

module.exports = {
  groupErrorData: function (data) {

    var groupedData = {};
    var groupLinkID = new Map();
    var errorPageData = [];

    //create linkid's for each group
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
      //var count = group.length;
      var firstErrorInGroup = group[0];

      errorPageData.push(firstErrorInGroup);

      (function (groupID, group) {
        cacheHandler.setValue('ErrorData_' + groupID, group)
          .then(function (result) {
            //console.log('ErrorData_' + groupID, group);
          })
          .catch(function (err) {
            console.error(err);
          });
      })(groupID, group);
    }

    //console.log(errorPageData);
    
    return errorPageData;
  }

};