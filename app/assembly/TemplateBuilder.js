'use strict';
const winston = require('winston');
const fs = require('fs-extra');
const Hogan = require('hogan.js');
const path = require('path');
const rootPath = path.resolve(__dirname, '../../');
const govukTemplateSourcePath = `${rootPath}/node_modules/govuk_template_mustache/views/layouts/govuk_template.html`;
const targetPath = `${rootPath}/tmp/templates`;
const govukTemplateTargetPath = `${targetPath}/govuk_template.html`;

const templateConfig = {
    assetPath: '{{assetPath}}',
    afterHeader: '{{$afterHeader}}{{/afterHeader}}',
    bodyClasses: '{{$bodyClasses}}{{/bodyClasses}}',
    bodyStart: '{{$bodyStart}}{{/bodyStart}}',
    bodyEnd: '{{$bodyEnd}}{{/bodyEnd}}',
    content: '{{$content}}{{/content}}',
    cookieMessage: '{{$cookieMessage}}{{/cookieMessage}}',
    crownCopyrightMessage: '{{$crownCopyrightMessage}}{{/crownCopyrightMessage}}',
    footerSupportLinks: '{{$footerSupportLinks}}{{/footerSupportLinks}}',
    footerTop: '{{$footerTop}}{{/footerTop}}',
    globalHeaderText: '{{$globalHeaderText}}GOV.UK{{/globalHeaderText}}',
    head: '{{$head}}{{/head}}',
    headerClass: '{{$headerClass}}{{/headerClass}}',
    homepageUrl: '{{$homepageUrl}}https://www.gov.uk{{/homepageUrl}}',
    htmlLang: '{{$htmlLang}}{{/htmlLang}}',
    insideHeader: '{{$insideHeader}}{{/insideHeader}}',
    licenceMessage: '{{$licenceMessage}}{{/licenceMessage}}',
    pageTitle: '{{$pageTitle}}GOV.UK - The best place to find government services and information{{/pageTitle}}',
    propositionHeader: '{{$propositionHeader}}{{/propositionHeader}}',
    skipLinkMessage: '{{$skipLinkMessage}}Skip to main content{{/skipLinkMessage}}',
    topOfPage: '{{$topOfPage}}{{/topOfPage}}'
};

module.exports = {
    build: function () {
        winston.info('Building gov.uk templates');
        fs.emptyDirSync(targetPath);
        const govukTemplate = fs.readFileSync(govukTemplateSourcePath, {encoding: 'utf-8'});
        const compiledTemplate = Hogan.compile(govukTemplate);
        fs.writeFileSync(govukTemplateTargetPath, compiledTemplate.render(templateConfig), {encoding: 'utf-8'});
    },
    GOV_UK_TEMPLATE_PATH: targetPath
};
