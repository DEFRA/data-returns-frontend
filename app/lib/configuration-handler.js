/*
 * Combines the configuration from the multi-section application.yml file with
 * the environment and presents a single configuration object to the application
 */
'use strict';

const path = require('path');
const winston = require("winston");
const fs = require('fs');
const ymal = require('yamljs');
const lodash = require('lodash');
const get = lodash.get;
const util = require('util');

/*
 * Hardcoded application characteristics
 */
const applicationFileName = path.join(__dirname, '../config/application.yml');
const requiredEnvironmentVariables = ['NODE_ENV'];
/*
 * Test that the required environment variables have been set up
 */
function getRequiredEnvironmentVariables() {
    var msg = '';
    var ev = {};
    for(let req of requiredEnvironmentVariables.entries()) {
        if (!process.env[req[1]]) {
            msg += 'Not set; required environment variable: ' + req[1] + '\n';
        } else {
            ev[req[1]] = process.env[req[1]];
        }
    }
    if (msg !== '') {
        throw msg;
    } else {
        return ev;
    }
}

function getYMLFileConfiguration(mode) {
    var sections = [''];
    var sectionNbr = 0;
    var config = {};

    winston.info('Reading configuration file: ' + applicationFileName);

    // Read the sections of the configuration file
    // Sections are begun by a line '---' and optionally ended by a line '...'
    fs.readFileSync(applicationFileName).toString().split('\n').forEach(function (line) {
        if (line.trim() === '---') {
            sectionNbr++;
            sections[sectionNbr] = '';
        } else if (line.trim() !== '...' && line.substring(0) !== '#') {
            sections[sectionNbr] += line + '\n';
        }
    });

    // Parse each of the file sections
    for (var i = 0; i < sections.length; i++) {
        var conf = ymal.parse(sections[i]);
        config[conf.env || 'global'] = conf;
    }

    // Check that both the global environment and the environment
    // specified in NODE_ENV exist
    if (!config[mode] || !config.global) {
        throw `Cannot find either global or environment section specified by: ${mode} in the configuration file: ${applicationFileName}`;
    }

    return lodash.merge(config.global, config[mode]);
}

function Configuration() {
    /*
     * Get the node environment
     */
    try {
        winston.info('Setting up system configuration for environment: ' + process.env.NODE_ENV);
        var environmentVariables = getRequiredEnvironmentVariables();
        var yMLFileConfiguration = getYMLFileConfiguration(process.env.NODE_ENV);
        this._configurationObject = lodash.merge(environmentVariables, yMLFileConfiguration);
        traverseObject(this._configurationObject, envVarSubstitution);
        winston.info(`Configuration for ${process.env.NODE_ENV} environment: \n` + util.inspect(this._configurationObject, {depth: null, colors: true}));
    } catch (err) {
        winston.error(err);
        throw 'Cannot load configuration...halting';
    }
}

function traverseObject(obj, callback, depth) {
    depth = depth || 0;
    Object.keys(obj).forEach(function(element) {
        if (obj[element] instanceof Object) {
            traverseObject(obj[element], callback, depth + 1);
        } else {
            obj[element] = callback(obj[element]);
        }
    }, this);
}

/*
 * Replaces given str with calculated environment variable if it contains
 * environment variables like ${DR_CLIENT_PORT}.
 * Throws exception if find a match but cannot compute the environment variable
 */
function envVarSubstitution(elem) {
    if (typeof elem === "string") {
        const pattern = /\$\{([A-Za-z0-9()*+-_/"#',;.@!?]*)\}/; // Pattern to find the environment variables in YMAL file
        var match = pattern.exec(elem);
        if (match) {
            let evaluate = process.env[match[1]];
            if (!evaluate) {
                throw 'Not set; required environment variable: ' + match[1];
            } else {
                winston.info(`Using environment variable: ${match[1]} = ${evaluate}`);
                return elem.replace(match[0], evaluate);
            }
        }
    }
    return elem;
}

Configuration.prototype.getConfigObject = function () {
    return this._configurationObject;
};

Configuration.prototype.get = function (item) {
    var result = get(this._configurationObject, item);
    if (typeof result === 'undefined') {
        winston.info('Cannot find configuration item: ' + item);
    } 
    return result;
};

/*
 * This idiom protects the configuration from writes within the application - the new is OK
 */
exports.Configuration = new Configuration;

