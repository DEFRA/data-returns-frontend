
var Hogan = require('hogan.js');
var Utils = require('../lib/utils');
var path = require('path');
var templateDir = path.resolve(__dirname, '../error-templates/');
var defaultTemplateName = 'DR3000';
var compiledTemplates = new Map();
var filenames = Utils.getFileList(templateDir);
var filecount = 1;
//preload and compile error-templates
console.log('==> Loading Templates...');
filenames.forEach(function (filename) {
  console.log('\tLoading ' + filename,filecount++);
  
  Utils.readFile(path.join(templateDir, filename), function (err, result) {
    if (err) {
      console.error('Unable to read ' + filename, err);
    } else {
      var x = filename.indexOf('.html');
      var key = filename.substring(0, x);
      var hiddenField = '<hidden id="error-number" value="' + key + '" ></hidden>';
      var compiledTemplate = Hogan.compile(hiddenField + result);
      compiledTemplates.set(key, compiledTemplate);
    }
  });
});
console.log('<== ' + filecount + 'Templates loaded');
/*
 * 
 */
function pad(num, len) {
  return (Array(len).join('0') + num).slice(-len);
}

module.exports.render = function (errorcode, metadata) {

  var key = 'DR' + pad(errorcode, 4);
  var template, ret;
  console.log('==> error-handler.render() ', key);

  if (compiledTemplates.has(key)) {
    template = compiledTemplates.get(key);
  } else {
    template = compiledTemplates.get(defaultTemplateName);
  }

  if (metadata) {
    ret = template.render(metadata);
  } else {
    ret = template.render();
  }
  console.log('<== error-handler.render()');
  return ret;
};
