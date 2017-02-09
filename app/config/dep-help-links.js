/*
 * This module contains links that would otherwise be hard coded in the view.
 */
module.exports.links = {
    HowToFormatEnvironmentAgencyData: '/guidance/landfill-data-rules',
    EnvironmentalPermittingLandfillSectorTechnicalGuidance: 'https://www.gov.uk/government/collections/environmental-permitting-landfill-sector-technical-guidance',
    EnvironmentAgencyContacts: 'https://www.gov.uk/government/organisations/environment-agency#org-contacts',
    EnvironmentAgencyEnquiriesEmailAddress: 'enquiries@environment-agency.gov.uk',
    RegimeSpecificRules: '/guidance/landfill-data-rules',
    EnvironmentAgencyHome: 'https://www.gov.uk/government/organisations/environment-agency',
    CreateAndSaveCSVFile: '/guidance/landfill-data-rules',
    ScottishLink: 'http://www.sepa.org.uk/',
    WelshLink: 'http://naturalresources.wales/splash?orig=/',
    NorthernIrelandLink: 'https://www.doeni.gov.uk/',
    Information_Commissioners_Website:'https://ico.org.uk/for-the-public/online/cookies/',
    Help_SpecialCases: '/guidance/landfill-data-rules#exceptions',
    Landfill_Data_Rules: '/guidance/landfill-data-rules',
    Help_Operator_Lookup: '/lookup',
    Example_Data_Return: '/guidance/example-data-return',
    Privacy_Policy: '/guidance/privacy',
    fields: {
        Rtn_Type: "/display-list?list=Rtn_Type",
        Rtn_Period: "/display-list?list=Rtn_Period",
        Parameter: "/display-list?list=Parameter",
        Txt_Value: "/display-list?list=Txt_Value",
        Unit: "/display-list?list=Unit",
        Ref_Period: "/display-list?list=Ref_Period",
        Meth_Stand: "/display-list?list=Meth_Stand",
        Qualifier: "/display-list?list=Qualifier",
        Rel_Trans: "/display-list?list=Rel_Trans"
    },
    fieldDefinitions: {
        EA_ID: "Your EA unique identifier: For permits - 2 capital letters, 4 numbers and 2 capital letters (eg, AB1234ZZ) or for Waste Management Licences - a 5 or 6 digit number (eg, 654321)",
        Rtn_Type: "The type of data being returned",
        Mon_Date: "Monitoring date/time. This is the date and (optionally) time (eg, for a spot sample). If you're monitoring for a period of time this is the date/time at the end of the monitoring period",
        Rtn_Period: "Name of date range covering the entire return",
        Mon_Point: "The monitoring point reference for where the sample was taken. Refer to the sampling or emission point described in your permit or licence",
        Ref_Period: "The chemical substance or parameter you're monitoring. Select an entry from the parameter controlled list",
        Meth_Stand: "Method or standard used for monitoring",
        Rel_Trans: "Releases and Transfers"
    },
    downloads: {
        Rtn_Type: "/csv/Rtn_Type",
        Rtn_Period: "/csv/Rtn_Period",
        Parameter: "/csv/Parameter",
        Txt_Value: "/csv/Txt_Value",
        Unit: "/csv/Unit",
        Ref_Period: "/csv/Ref_Period",
        Meth_Stand: "/csv/Meth_Stand",
        Qualifier: "/csv/Qualifier",
        Rel_Trans: "/csv/Rel_Trans"
    }
};
