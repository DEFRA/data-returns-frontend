'use strict';
const cfg = {
    'Rtn_Type': {
        'title': 'Return type',
        'fields': {
            'Rtn_Type': {'jsonPath': 'nomenclature', 'searchable': true, 'cellCls': 'name'}
        },
        'md_api_entity_collection': 'returnTypes'
    },

    'Ref_Period': {
        'title': 'Reference period',
        'fields': {
            'Ref_Period': {'jsonPath': 'nomenclature', 'searchable': true, 'cellCls': 'name'},
            'Alternatives': {'jsonPath': 'aliases[*].nomenclature', 'searchable': true, 'cellCls': 'aliases'},
            'Notes': {'jsonPath': 'notes', 'searchable': false, 'cellCls': 'notes'}
        },
        'md_api_entity_collection': 'referencePeriods'
    },

    'Rtn_Period': {
        'title': 'Return period',
        'fields': {
            'Rtn_Period': {'jsonPath': 'nomenclature', 'searchable': true, 'cellCls': 'name'},
            'Definition': {'jsonPath': 'definition', 'searchable': false, 'cellCls': 'definition'},
            'Example': {'jsonPath': 'example', 'searchable': false, 'cellCls': 'example'}
        },
        'md_api_entity_collection': 'returnPeriods'
    },

    'Parameter': {
        'title': 'Parameter (substance name)',
        'fields': {
            'Parameter': {'jsonPath': 'nomenclature', 'searchable': true, 'cellCls': 'name'},
            'Alternatives': {'jsonPath': 'aliases[*].nomenclature', 'searchable': true, 'cellCls': 'aliases'},
            'CAS': {'jsonPath': 'cas', 'searchable': true, 'cellCls': 'cas'}
        },
        'md_api_entity_collection': 'parameters'
    },

    'Unit': {
        'title': 'Unit or measure',
        'fields': {
            'Unit': {'jsonPath': 'nomenclature', 'searchable': true, 'cellCls': 'name'},
            'Alternatives': {'jsonPath': 'aliases[*].nomenclature', 'searchable': true, 'cellCls': 'aliases'},
            'Long Name': {'jsonPath': 'long_name', 'searchable': true, 'cellCls': 'longName'},
            'Type': {'jsonPath': 'type.nomenclature', 'searchable': true, 'cellCls': 'type'},
            'Unicode': {'jsonPath': 'unicode', 'searchable': false, 'cellCls': 'unicode'},
            'Description': {'jsonPath': 'description', 'searchable': false, 'cellCls': 'description'}
        },
        'md_api_entity_collection': 'units'
    },

    'Qualifier': {
        'title': 'Qualifier',
        'fields': {
            'Qualifier': {'jsonPath': 'nomenclature', 'searchable': true, 'cellCls': 'name'},
            'Notes': {'jsonPath': 'notes', 'searchable': false, 'cellCls': 'notes'},
            'Type': {'jsonPath': 'type', 'searchable': false, 'cellCls': 'type'},
            'Single or multiple': {'jsonPath': 'single_or_multiple', 'searchable': false, 'cellCls': 'singleOrMultiple'}
        },
        'md_api_entity_collection': 'qualifiers'
    },

    'Meth_Stand': {
        'title': 'Monitoring standard or method',
        'fields': {
            'Meth_Stand': {'jsonPath': 'nomenclature', 'searchable': true, 'cellCls': 'name'},
            'Notes': {'jsonPath': 'notes', 'searchable': false, 'cellCls': 'notes'}
        },
        'md_api_entity_collection': 'methodOrStandards'
    },

    'Txt_Value': {
        'title': 'Text value',
        'fields': {
            'Txt_Value': {'jsonPath': 'nomenclature', 'searchable': true, 'cellCls': 'name'},
            'Alternatives': {'jsonPath': 'aliases[*].nomenclature', 'searchable': true, 'cellCls': 'aliases'}
        },
        'md_api_entity_collection': 'textValues'
    }
};

module.exports.config = {};

Object.keys(cfg).map(key => {
    const listItem = cfg[key];
    listItem.heading = key;
    return listItem;
}).forEach(listItem => {
    module.exports.config[listItem.heading] = listItem;
});
