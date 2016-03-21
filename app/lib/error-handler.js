
var Hogan = require('hogan.js');
var Utils = require('../lib/utils');
var templateDir = '../error-templates/';


var templateNames = ['DR0400', 'DR0500', 'DR0600', 'DR0700', 'DR0800', 'DR0810', 'DR0820', 'DR0830', 'DR0840', 'DR0910', 'DR0920', 'DR0930', 'DR0940', 'DR0950', 'DR0960', 'DR0970', 'DR0980', 'DR0990', 'DR1000', 'DR1010', 'DR1020', 'DR2050', 'DR2225', 'DR2275', 'DR3000'];
var defaultTemplateName = 'DR3000';

var compiledTemplates = new Map();

//preload templates
templateNames.forEach(function (templateName) {

  Utils.readFile(templateDir + templateName + '.html', function (err, result) {
    if (err) {
      console.error('Unable to read ' + templateName, err);
    } else {
      var hiddenField = '<hidden id="error-number" value="' + templateName + '" ></hidden>';
      var compiledTemplate = Hogan.compile(hiddenField + result);
      compiledTemplates.set(templateName, compiledTemplate);
    }
  });
});

/*
 * 
 */
function pad(num, len) {
  return (Array(len).join('0') + num).slice(-len);
}

module.exports.render = function (errorcode, metadata) {

  var templateName = 'DR' + pad(errorcode, 4);
  var template, ret;
  console.log('==> error-handler.render() ', templateName);

  if (compiledTemplates.has(templateName)) {
    template = compiledTemplates.get(templateName);
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
