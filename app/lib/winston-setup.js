"use strict";
const winston = require("winston");
const airbrake = require("airbrake");
const merge = require('merge');
const util = require('util');
const lodash = require("lodash");
const config = require('../config/configuration_' + (process.env.NODE_ENV || 'local'));

/**
 * Airbrake transport class
 *
 * @param options
 * @returns {AirbrakeTransport}
 * @constructor
 */
let AirbrakeTransport = function(options) {
    this.name = 'airbrake';
    this.level = options.level || "error";
    this.airbrake = airbrake.createClient(config.logging.errbit.appName, config.logging.errbit.apiKey);
    this.airbrake.appVersion = config.appversion;
    this.airbrake.protocol = "https";
    // Environments which shall never log to airbrake. (overridden here as by default includes 'development' and 'test')
    this.airbrake.developmentEnvironments = ['local'];
    return this;
};
// Set AirbrakeTransport to inherit from winston.Transport
util.inherits(AirbrakeTransport, winston.Transport);
// Override the transport log method to pass data through to airbrake
AirbrakeTransport.prototype.log = function(level, msg, meta, callback) {
    let airbrakeData = meta;
    if (!lodash.isError(meta)) {
        airbrakeData = new Error(msg, meta);
    }
    // TODO: Log notification errors to the file appender rather than using console.
    try {
        this.airbrake.notify(airbrakeData, function(err, url) {
            if (err) {
                console.error(`Airbrake notification failure: ${err.message}`, err);
            }
            callback(err);
        });
    } catch (e) {
        console.error(`Airbrake notification failure: ${e.message}`, e);
    }
};

let commonLoggingOpts = {
    "level": config.logging.level || "info",
    "colorize": true,
    "silent": false,
    "timetamp": true,
    "json": false,
    "showLevel": true,
    "handleExceptions": true,
    "humanReadableUnhandledException": true
};
let fileLoggingOpts = {
    "filename": "logs/datareturns.log",
    "maxsize": 2 * Math.pow(2, 20),
    "maxFiles": 10,
    "tailable": true
};

winston.exitOnError = false;

// Configure logging
winston.clear();
winston.add(winston.transports.File, merge(commonLoggingOpts, fileLoggingOpts));
winston.add(winston.transports.Console, commonLoggingOpts);

if (config.logging.errbit.enabled) {
    winston.info("Enabling errbit integration.");
    winston.add(AirbrakeTransport, merge(commonLoggingOpts, { level: config.logging.errbit.level }));
}

// Rexport winston shared logger from this module
module.exports = winston;