"use strict";
const config = require("../config/configuration_" + (process.env.NODE_ENV || "local"));
const Airbrake = require("airbrake");
const typeDetect = require("type-detect");
let airbrake = Airbrake.createClient(config.errbit.options.appName, config.errbit.options.apiKey);

/**
 * Initialise airbrake
 */
(function() {
    airbrake.appVersion = config.appversion;
    airbrake.protocol = "https";

    if (config.errbit.options.enabled === true) {
        airbrake.handleExceptions();
    }
})();

module.exports = {
    registerHapi: function(server) {
        if (config.errbit.options.enabled === true) {
            server.register(airbrake.hapiHandler(), err => {
                if (err) throw err;
            });
        }
    },
    notify: function (err) {
        if (config.errbit.options.enabled === true) {
            let type = typeDetect(err);
            let error = null;

            switch (type) {
                case "error":
                    error = err;
                    break;
                case "object":
                case "array":
                    error = new Error(JSON.stringify(err));
                    break;
                default:
                    error = new Error(err);
                    break;
            }
            airbrake.notify(error);
        }
    }
};