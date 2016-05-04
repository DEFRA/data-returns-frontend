/*
 * Helper module to help handle multiple errors returned from the backend API
 * 
 * 
 */
var uuid = require('node-uuid');
var cacheHandler = require('../lib/cache-handler');
var Hogan = require('hogan.js');
var Utils = require('../lib/utils');
var _ = require('lodash');

module.exports = {
  /*
   * Groups error data by column name and error type, 
   * where error type is ether missing or incorrect
   * caches the grouped data in Redis for use in error detail pages
   * @param the error data returned from the API
   */
  groupErrorData: function (sessionID, data) {

    console.log('==> groupErrorData() ');
    var groupedData = {};
    var groupLinkID = new Map();
    var errorPageData = [];
    //create linkid's for each group (used in html page links)
    data.forEach(function (item) {
      var columnName = item.fieldName;
      //var errorType = item.errorType;//item.errorValue === null ? 'Missing' : 'Incorrect';
      var groupkey = columnName; //+ '_' + errorType;
      var groupID = item.errorCode;//+ '-' + uuid.v4();
      groupLinkID.set(groupkey, groupID);
    });
    //create grouped data for the details page
    var lineNos = new Map();
    data.forEach(function (item) {

      var columnName = item.fieldName;
      var errorType = item.errorValue === null ? 'Missing' : 'Incorrect';
      var errorValue = item.errorValue === null ? 'Missing' : item.errorValue;
      var rowNumber = item.lineNumber;
      var errorCode = item.errorCode;
      var errorMessage = item.errorMessage;
      var groupkey = columnName;
      var group = groupedData[groupkey] || [];
      var linekey = groupkey + rowNumber;
      var temp;
      var Correction = true;
      var CorrectionDetails = true;
      var CorrectionMoreHelp = true;

      var helpReference = item.helpReference;
      var moreHelp = item.moreHelp;
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
          moreHelp: moreHelp,
          groupID: groupLinkID.get(groupkey)
        };
        group.push(temp);
        //update errorType in an existing record in the group
        //if there is both missing and incorrect in the group
        var clonedGroup = _.groupBy(group, 'errorType');
        var groupCount = Object.keys(clonedGroup).length;
        group.forEach(function (record) {
          if (record.columnName === columnName && groupCount > 1) {
            record.errorType = 'Missing and incorrect';
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
        //'ErrorData_' + groupid
        //sessionID + '-ErrorData-' + groupID
        cacheHandler.setValue(sessionID + '-ErrorData-' + groupID, group)
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
  },
  getErrorDetails: function (data) {

    return new Promise(function (resolve, reject) {
      var errorDetails = [];
      var dataClone = _.cloneDeep(data);

      //substitute null and undefined error Values for the word 'Missing'
      //and LENGTH for 'Incorrect'
      dataClone.forEach(function (row) {
        if (row.errorValue === 'undefined' || row.errorValue === null) {
          row.errorValue = 'Missing';
        }
        if (row.errorValue === 'LENGTH') {
          row.errorValue = 'Incorrect';
        }
      });

      // use lodash to group errors by errorValue
      var groupedData = _.groupBy(dataClone, 'errorValue');
      var groupKeys = _.keys(groupedData);
      var group, sortedGroup, index, item, prevRowNumber;
      var rowNumberText = null, detailRow;

      groupKeys.forEach(function (groupKey) {
        group = groupedData[groupKey];
        //sort each group by row number
        sortedGroup = _.sortBy(group, 'rowNumber');

        //Process row numbers format for display
        rowNumberText = null;
        var max = sortedGroup.length;
        var wasAdj = false;

        for (var i = 0; i < max; i++) {
          item = sortedGroup[i];

          //first record
          if (i === 0) {
            rowNumberText = item.rowNumber;
            prevRowNumber = item.rowNumber;
          } else {
            //subsequent records 
            //is the current row adjacent to previous row
            if ((prevRowNumber + 1) === item.rowNumber) {
              wasAdj = true;
            } else {
              if (wasAdj) {
                rowNumberText += '-' + sortedGroup[(i - 1)].rowNumber;
              }
              rowNumberText += ', ' + item.rowNumber;
              wasAdj = false;
            }
            prevRowNumber = item.rowNumber;
          }
          detailRow = item;
        }

        if (wasAdj) {
          rowNumberText += '-' + sortedGroup[max - 1].rowNumber;
        }

        detailRow.rowNumberText = rowNumberText;
        detailRow.errorValue = _.upperFirst(groupKey);
        errorDetails.push(detailRow);

      });

      //phew! and finally sort on the error !
      errorDetails = _.sortBy(errorDetails, 'errorValue');
      resolve(errorDetails);
    });
  }

};