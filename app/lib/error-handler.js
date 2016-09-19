'use strict';
const winston = require("winston");
const hogan = require('hogan.js');
const utils = require('../lib/utils');
const path = require('path');
const lodash = require('lodash');
const commonViewData = require("../lib/common-view-data");
const templateDir = path.resolve(__dirname, '../error-templates/');
const filenames = utils.getFileListInDir(templateDir);

//preload and compile error-templates
var loadErrorTemplates = function () {
    winston.info('==> Loading Templates...');
    let compiledTemplates = {};
    let templatesLoaded = 0;
    filenames.forEach(function (filename) {
        utils.readFile(filename, function (err, fileContents) {
            if (err) {
                winston.error(err);
            } else {
                let x = filename.lastIndexOf('/');
                let y = filename.indexOf('.html');
                let key = filename.substring(x + 1, y);
                try {
                    let compiledTemplate = hogan.compile(fileContents);
                    compiledTemplates[key] = compiledTemplate;
                } catch (e) {
                    winston.error(`Failed to compile template for ${filename}: ${e.message}`, e);
                }
            }
        });
        templatesLoaded++;
    });
    winston.info(`<== ${templatesLoaded} templates loaded`);
    return compiledTemplates;
};

var compiledTemplates = loadErrorTemplates();

module.exports.render = function (errorcode, metadata, defaultErrorMessage) {
    let viewData = lodash.merge({}, commonViewData, metadata);

    var key = 'DR' + utils.pad(errorcode, 4);
    var template, ret;
    template = compiledTemplates[key];

    if (template) {
        if (metadata) {
            ret = template.render(viewData);
        } else {
            ret = template.render();
        }
    } else {
        ret = defaultErrorMessage;
    }
    return ret;
};