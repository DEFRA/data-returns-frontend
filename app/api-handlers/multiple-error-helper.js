/*
 * Helper module to help handle multiple errors returned from the backend API
 * 
 * 
 */
var uuid = require('node-uuid');
var cacheHandler = require('../lib/cache-handler');
var Hogan = require('hogan.js');
var Utils = require('../lib/utils');

module.exports = {
  /*
   * Groups error data by column name and error type, 
   * where error type is ether missing or incorrect
   * caches the grouped data in Redis for use in error detail pages
   * @param the error data returned from the API
   */
  groupErrorData: function (data) {

    console.log('==> groupErrorData() ');

    var groupedData = {};
    var groupLinkID = new Map();
    var errorPageData = [];

    //create linkid's for each group (used in html page links)
    data.forEach(function (item) {
      var columnName = item.fieldName;
      //var errorType = item.errorType;//item.errorValue === null ? 'Missing' : 'Incorrect';
      var groupkey = columnName;//+ '_' + errorType;
      var groupID = uuid.v4();
      groupLinkID.set(groupkey, groupID);
    });

    //create grouped data for the details page
    var lineNos = new Map();
    data.forEach(function (item) {

      var columnName = item.fieldName;
      var errorType = item.errorType; //item.errorValue === null ? 'Missing' : 'Incorrect';
      var errorValue = item.errorValue;
      var rowNumber = item.lineNumber;
      var errorCode = item.errorCode;
      var errorMessage = item.errorMessage;
      var groupkey = columnName;// + '_' + errorType;
      var group = groupedData[groupkey] || [];
      var linekey = groupkey + rowNumber;
      var temp;
      var Correction = true;
      var CorrectionDetails = true;
      var CorrectionMoreHelp = true;
      var helpReference = item.helpReference;
      var definition = item.definition;

      if (!lineNos.has(linekey)) {
        //Add a record to the group
        lineNos.set(linekey, linekey);
        temp = {
          rowNumber: rowNumber,
          columnName: columnName,
          errorValue: errorValue,
          errorType: Utils.titleCase(errorType),
          errorMessage: errorMessage,
          errorCode: errorCode,
          helpReference: helpReference,
          definition: definition,
          Correction: Correction,
          CorrectionDetails: CorrectionDetails,
          CorrectionMoreHelp: CorrectionMoreHelp,
          groupID: groupLinkID.get(groupkey)
        };
        group.push(temp);
      } else {
        //update errorType in an existing record in the group
        group.forEach(function (record) {
          if (record.columnName === columnName) {
            if (record.errorType !== errorType) {
              record.errorType = 'Missing or incorrect';
            }
          }
        });
      }

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
          .then(function () {
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
   * @param template the Handlebars template to render.
   * @param metadata the Metadata to inject into the template.
   * @return rendered string 
   */
  renderErrorMessage: function (template, metadata) {
    console.log('==> renderErrorMessage()');
    var ret = template;
    var mustRender = false;
    var compiledTemplate;

    if (template && metadata) {
      template = (typeof (template) === 'object') ? JSON.stringify(template) : template;
      compiledTemplate = Hogan.compile(template);

      //Check if the template requires metadata
      for (var linkName in metadata) {
        if (template.indexOf(linkName) !== -1) {
          mustRender = true;
          break;
        }
      }

      if (mustRender) {
        ret = compiledTemplate.render(metadata);
      }
    }

    console.log('<== renderErrorMessage()');

    return ret;

  }

};