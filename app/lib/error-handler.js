'use strict';
const winston = require("winston");
const fs = require("fs");
const klaw = require("klaw");
const hogan = require('hogan.js');
const utils = require('../lib/utils');
const path = require('path');
const lodash = require('lodash');
const commonViewData = require("../lib/common-view-data");
const templateDir = path.resolve(__dirname, '../error-templates/');

//preload and compile error-templates
let compiledTemplates = new Map();
(function () {
    winston.info('==> Loading Templates...');
    let templateFiles = [];
    klaw(templateDir).on('data', function (item) {
        if (item.stats.isFile()) {
            templateFiles.push(item.path);
        }
    }).on('end', () => {
        winston.info(`Found ${templateFiles.length} templates to load`);
        for (let filename of templateFiles) {
            fs.readFile(filename, 'utf8', function (err, fileContents) {
                if (err) {
                    winston.error('Unable to read template file', err);
                } else {
                    let x = filename.lastIndexOf('/');
                    let y = filename.indexOf('.html');
                    let key = filename.substring(x + 1, y);
                    try {
                        let errorCodeText = key;
                        let violationType = null;
                        if (key.includes('-')) {
                            let keyParts = key.split('-');
                            errorCodeText = keyParts[0];
                            violationType = keyParts[1];
                        }
                        errorCodeText = errorCodeText.replace(/\D+/g, '');

                        let templateData = {
                            errorCode: parseInt(errorCodeText),
                            violationType: violationType,
                            key: key,
                            filename: filename,
                            template: hogan.compile(fileContents)
                        };
                        winston.info("Added template for key " + key);
                        compiledTemplates.set(key, templateData);
                    } catch (e) {
                        winston.error(`Failed to compile template for ${filename}: ${e.message}`, e);
                    }
                }
            });
        }


    });
})();

/**
 * Render an error snippet for the given errorCode
 *
 *
 * @param errorCode the numeric error code (e.g. 860)
 * @param metadata metadata to supply to the view
 * @param defaultErrorMessage the default error message to render if an appropriate template cannot be found
 * @returns the result of rendering the mustache template
 */
module.exports.render = function (errorCode, metadata, defaultErrorMessage) {
    let viewData = lodash.merge({}, commonViewData, metadata);
    let key = 'DR' + utils.pad(errorCode, 4);
    let templateData = compiledTemplates.get(key);
    if (templateData) {
        return templateData.template.render(viewData);
    } else {
        return defaultErrorMessage;
    }
};

module.exports.compiledTemplates = compiledTemplates;

/**
 * Render a correction message for the given arguments.
 *
 * This method attempts to find the appropriate html snippet for the errorCode and violation type.  If the specific
 * snippet
 *
 *
 * @param errorCode the numeric error code (e.g. 9140)
 * @param violationType the violation type text (e.g. Missing, Incorrect, Length)
 * @param metadata metadata to supply to the view
 * @param defaultErrorMessage the default error message to render if an appropriate template cannot be found
 * @returns the result of rendering the mustache template
 */
module.exports.renderCorrectionMessage = function (errorCode, violationType, metadata, defaultErrorMessage) {
    let viewData = lodash.merge({}, commonViewData, metadata);
    let snippetCode = `DR${utils.pad(errorCode, 4)}`;
    let key = `${snippetCode}`;
    if (violationType) {
        key += `-${violationType}`;
    }

    let templateData = compiledTemplates.get(key);
    let defaultTemplateData = compiledTemplates.get(`Default-${violationType}`);
    if (templateData) {
        return templateData.template.render(viewData);
    } else if (defaultTemplateData) {
        return defaultTemplateData.template.render(viewData);
    } else {
        return defaultErrorMessage;
    }
};