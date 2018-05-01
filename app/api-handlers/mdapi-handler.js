'use strict';
const config = require('../lib/configuration-handler.js').Configuration;
const rp = require('request-promise');
const mdApiBase = config.get('endpoints.md_api.base');

module.exports = {
    getByNomenclature: function (entityName, nomenclature) {
        return rp.get({
            uri: `${mdApiBase}/${entityName}/search/getByNomenclature`,
            qs: {
                'nomenclature': nomenclature
            },
            // TODO: Remove basic auth and add functionality to pass through auth token once integrated with the IDM
            auth: {
                user: config.get('endpoints.ecm_api.auth.username'),
                password: config.get('endpoints.ecm_api.auth.password'),
                sendImmediately: true
            },
            json: true
        });
    },
    list: function (entityName) {
        return rp.get({
            uri: `${mdApiBase}/${entityName}`,
            // TODO: Remove basic auth and add functionality to pass through auth token once integrated with the IDM
            auth: {
                user: config.get('endpoints.ecm_api.auth.username'),
                password: config.get('endpoints.ecm_api.auth.password'),
                sendImmediately: true
            },
            json: true
        });
    }
};
