/*
 * Helper module to help handle multiple errors returned from the backend API
 * 
 * 
 */
var uuid = require('node-uuid');
var cacheHandler = require('../lib/cache-handler');
var Hogan = require('hogan.js');

module.exports = {
  /*
   * Groups error data by column name and error type, 
   * where error type is ether missing or incorrect
   * caches the grouped data in Redis for use in error detail pages
   */
  groupErrorData: function (data) {

    console.log('==> groupErrorData() ');

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

    console.log('<== groupErrorData() ');
    return errorPageData;
  },
  /*
   * Injects metadata into a template if the metadata place holder and data exists.
   * @return rendered string 
   */
  renderErrorMessage: function (template, metadata) {
    console.log('==> renderErrorMessage()');
    var ret = template;
    var mustRender = false;

    if (template && metadata) {
      var CompiledTemplate = Hogan.compile(template);
      for (var linkName in metadata) {
        if (template.indexOf(linkName) !== -1) {
          mustRender = true;
        }
      }

      if (mustRender) {
        console.log('\t Rendering');
        ret = CompiledTemplate.render(metadata);
      }
    }

    console.log('<== renderErrorMessage()');

    return ret;

  }

};