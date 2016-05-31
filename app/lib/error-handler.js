
'use strict';


var hogan = require('hogan.js');
var utils = require('../lib/utils');
var path = require('path');
var templateDir = path.resolve(__dirname, '../error-templates/');
var filenames = utils.getFileListInDir(templateDir);
var filecount = 1;
var x, y, key, compiledTemplate;
var errBit = require('../lib/errbitErrorMessage');

//preload and compile error-templates
var loadErrorTemplates = function () {
  console.log('==> Loading Templates...');
  var compiledTemplates = {};
  filenames.forEach(function (filename) {
    filecount++;
    //console.log('\tLoading ' + filename, filecount++);
    utils.readFile(filename, function (err, fileContents) {
      if (err) {
        var msg = new errBit.errBitMessage(err, __filename, 'loadErrorTemplates())', 24);
        console.error(msg);
      } else {
        x = filename.lastIndexOf('/');
        y = filename.indexOf('.html');
        key = filename.substring(x + 1, y);
        compiledTemplate = hogan.compile(fileContents);
        compiledTemplates[key] = compiledTemplate;
      }
    });
  });

  console.log('<== ' + filecount + ' Templates loaded');
  return compiledTemplates;
};

var compiledTemplates = loadErrorTemplates();

module.exports.render = function (errorcode, metadata, defaultErrorMessage) {

  var key = 'DR' + utils.pad(errorcode, 4);
  var template, ret;
  console.log('==> error-handler.render() ', key);

  template = compiledTemplates[key];

  if (template) {
    if (metadata) {
      ret = template.render(metadata);
    } else {
      ret = template.render();
    }
  } else {
    ret = defaultErrorMessage;
  }

  console.log('<== error-handler.render()', key);
  return ret;
};


