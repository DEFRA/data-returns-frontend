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
    Cookie_Guidance: 'http://www.aboutcookies.org/how-to-control-cookies/',
    Cookie_Page: '/guidance/cookies.html',
    Start_Page: '/start',
    Done_Page: 'https://www.gov.uk/done/report-landfill-data',
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
        EA_ID: "A unique identifier for the data. It's the permit or licence number that we have in our records. You need to look this up using our finder.",
        Rtn_Type: "Return type: the type of data being reported.",
        Mon_Date: "Monitoring date and time. Date and, where your permit asks for it or if you want to submit it, the time the measurement was taken. If you're monitoring for a period of time (for example, a week), give the date at the end of the monitoring period.",
        Rtn_Period: "Return period: The date range for the data.",
        Mon_Point: "The monitoring point reference where the sample was taken. The sampling or emission point is described in your permit or licence.",
        Ref_Period: "The reference period for the sample, as specified in your permit or licence. This explains how the sample was taken.",
        Meth_Stand: "The method or standard used for sampling.",
        Rel_Trans: "Releases and transfers."
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
