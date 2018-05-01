'use strict';
const winston = require('winston');
const listConfig = require('../../config/ControlledListConfig');
const mdApiHandler = require('../../api-handlers/mdapi-handler');
const JsonPath = require('JSONPath');

const stringify = require('csv').stringify;
const errorMessages = require('../../lib/error-messages');
const errorHandler = require('../../lib/error-handler');
const sequence = require('../../lib/array/sequence');

const getNavigationSource = function (request) {
    return request.query.src || request.info.referrer || '/guidance/landfill-data-rules';
};

/**
 * Creates a result processor to process the JSON returned by the master data API and transform it into a structure
 * that the mustache templates are capable of processing
 *
 * @param listConfiguration
 * @param filterFn
 * @returns {function(*)}
 */
function createResultProcessor (listConfiguration, filterFn = () => true) {
    return (result) => {
        const headings = Object.keys(listConfiguration.fields);
        return result._embedded[listConfiguration.md_api_entity_collection]
            .filter(filterFn)
            .map(entity => {
                return {
                    cells: headings.map(h => {
                        const fieldCfg = listConfiguration.fields[h];
                        return {
                            cellCls: fieldCfg.cellCls,
                            values: extractValues(entity, fieldCfg)
                        };
                    })
                };
            });
    };
}

/**
 * Given a master data entity json structure and the configuration for a controlled list field, extract an array
 * of values which should be displayed in a given cell
 *
 * @param entityJson
 * @param fieldCfg
 * @returns {*}
 */
function extractValues (entityJson, fieldCfg) {
    let cellValues = JsonPath({json: entityJson, path: fieldCfg.jsonPath, wrap: false});
    if (!Array.isArray(cellValues)) cellValues = [cellValues];
    return cellValues.filter(v => !!v);
}

module.exports = {
    /**
     * Display available lists
     * @param request
     * @param reply
     */
    availableLists: function (request, reply) {
        // Convert associative array to an indexed array for the view template.
        const listArr = Object.keys(listConfig.config).map(k => listConfig.config[k]);
        reply.view('data-returns/controlled-lists', {
            controlledLists: listArr
        });
    },

    /**
     * Display list data
     * @param request
     * @param reply
     */
    getDisplayHandler: function (request, reply) {
        const list = request.query.list;
        const cfg = listConfig.config[list];
        if (!cfg) {
            reply.redirect('/controlled-lists');
        }

        mdApiHandler.list(cfg.md_api_entity_collection)
            .then(createResultProcessor(cfg))
            .then((viewDataModel) => {
                reply.view('data-returns/display-list', {
                    listMetaData: cfg,
                    tableHeadings: Object.keys(cfg.fields),
                    rows: viewDataModel,
                    clear: false,
                    src: getNavigationSource(request)
                });
            })
            .catch((e) => {
                winston.error(e);
                reply.redirect('/failure');
            });
    },

    getDisplayHandlerWithSearch: function (request, reply) {
        const list = request.query.list;
        const cfg = listConfig.config[list];
        if (!cfg) {
            reply.redirect('/controlled-lists');
        }
        let searchString = request.query.q ? request.query.q.trim() : '';
        if (!searchString || !searchString.length) {
            mdApiHandler.list(cfg.md_api_entity_collection)
                .then(createResultProcessor(cfg))
                .then((viewDataModel) => {
                    reply.view('data-returns/display-list', {
                        listMetaData: cfg,
                        tableHeadings: Object.keys(cfg.fields),
                        rows: viewDataModel,
                        clear: true,
                        src: getNavigationSource(request),
                        errorMessage: errorHandler.render(errorMessages.LIST_LOOKUP.NOTHING_TO_SEARCH_WITH)
                    });
                })
                .catch((e) => {
                    winston.error(e);
                    reply.redirect('/failure');
                });
        } else {
            searchString = searchString.trim();
            const headings = Object.keys(cfg.fields);
            const searchTerms = searchString.split(/\s+/);
            const searchTermStrings = sequence.humanisedJoin(searchTerms.map(t => `"${t}"`), 'or');
            const searchableHeadings = headings.map(h => cfg.fields[h]).filter(h => h.searchable);
            let searchableHeadingNames = null;
            const messages = [];

            const filterFn = (entity) => {
                let includeRow = false;
                for (const heading of headings) {
                    const fieldCfg = cfg.fields[heading];
                    if (fieldCfg.searchable) {
                        const cellValues = extractValues(entity, fieldCfg);
                        const found = cellValues.find(cv => {
                            for (const term of searchTerms) {
                                if (cv.toLowerCase().indexOf(term.toLowerCase()) !== -1) {
                                    return true;
                                }
                            }
                            return false;
                        });
                        includeRow = !!found || includeRow;
                    }
                }
                return includeRow;
            };

            mdApiHandler.list(cfg.md_api_entity_collection)
                .then(createResultProcessor(cfg, filterFn))
                .then((viewDataModel) => {
                    const headings = Object.keys(cfg.fields);
                    const entryText = viewDataModel.length === 1 ? 'entry' : 'entries';
                    messages.push(`Found ${viewDataModel.length} ${entryText} matching ${searchTermStrings}`);

                    if (viewDataModel.length === 0 && headings.length > 1 && searchableHeadings.length < headings.length) {
                        searchableHeadingNames = sequence.humanisedJoin(searchableHeadings.map(t => t.header), 'and');
                    }

                    // Add search fields to the config to enable result highlighting.
                    cfg.searchFields = searchableHeadings.map(s => s.cellCls).join(',');

                    const replyObj = {
                        listMetaData: cfg,
                        tableHeadings: headings,
                        rows: viewDataModel,
                        clear: true,
                        src: getNavigationSource(request),
                        messages: messages,
                        query: {
                            string: searchString,
                            terms: searchTerms
                        }
                    };

                    if (viewDataModel.length === 0) {
                        replyObj.errorMessage = errorHandler.render(errorMessages.LIST_LOOKUP.NO_RESULTS, {
                            searchString: searchString,
                            searchableHeadingNames: searchableHeadingNames
                        });
                    }

                    reply.view('data-returns/display-list', replyObj);
                })
                .catch((e) => {
                    winston.error(e);
                    reply.redirect('/failure');
                });
        }
    },

    /**
     * Serve list csv
     *
     * @param request
     * @param reply
     */
    getCSVHandler: function (request, reply) {
        if (!request.params || !request.params.list) {
            throw new Error('Expected - filename');
        }
        const cfg = listConfig.config[request.params.list];
        if (!cfg) {
            reply.redirect('/controlled-lists');
        }

        const filename = request.params.list + '.csv';
        winston.info('==> /csv-list ' + filename);

        mdApiHandler.list(cfg.md_api_entity_collection)
            .then((result) => {
                const headings = Object.keys(cfg.fields);
                const entries = result._embedded[cfg.md_api_entity_collection];
                const headingCountMap = new Map();

                // Preprocess all entries to calculate how many headings we shall need.
                for (const entity of entries) {
                    headings.map(h => {
                        const values = extractValues(entity, cfg.fields[h]);
                        headingCountMap.set(h, Math.max(values.length, headingCountMap.get(h) || 1));
                    });
                }

                // Now we can initialise the row data
                const rows = [];
                for (const entity of entries) {
                    const rowData = {};
                    for (const entry of headingCountMap) {
                        const heading = entry[0];
                        const count = entry[1];
                        const values = extractValues(entity, cfg.fields[heading]);

                        if (count > 1) {
                            for (let i = 0; i < count; i++) {
                                rowData[heading + ` (${i + 1})`] = values[i];
                            }
                        } else {
                            rowData[heading] = values[0];
                        }
                    }
                    rows.push(rowData);
                }

                // From the headings count map, build a list of headings
                const cols = [];
                for (const entry of headingCountMap) {
                    const heading = entry[0];
                    const count = entry[1];
                    if (count > 1) {
                        for (let i = 0; i < count; i++) {
                            cols.push(heading + ` (${i + 1})`);
                        }
                    } else {
                        cols.push(heading);
                    }
                }

                stringify(rows, {header: true, columns: cols, quoted: true}, function (err, output) {
                    if (err) {
                        winston.error('Failed to write downloadable CSV for controlled lists.', err);
                        reply.redirect('/failure');
                    } else {
                        // UTF8 BOM is required so as not to corrupt special UTF8 characters in Excel.
                        const UTF8_BOM = '\uFEFF';
                        const response = reply(UTF8_BOM + output)
                            .header('Content-Type', 'text/csv; charset=utf-8;')
                            .header('content-disposition', `attachment; filename=${filename};`)
                            .hold();
                        response.send();
                    }
                });
            })
            .catch((e) => {
                winston.error(e);
                reply.redirect('/failure');
            });
    }
};
