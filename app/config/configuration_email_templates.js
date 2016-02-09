

/*
 * Contains the email template for sending pin numbers
 * NOTE: SMTP Server config is in the seperate environment configs
 */

var footer = 'The Environment Agency';
footer += 'Telephone: 03708 506 506';
footer += 'Telephone from outside the UK: 00 44 1709 389 201';
footer += '(Mon to Fri, 8am to 6pm)';
footer += 'Minicom service, for the hard of hearing: 03702 422 549 National Customer Contact Centre.';
footer += 'Details of call charges can be found on the GOV.UK website';
footer += 'Email address: enquiries@environment-agency.gov.uk';

var sendPinTemplate = 'You requested a pin from the Environment Agency to make a data return.';
sendPinTemplate += 'Go to your browser and use this code to confirm your email address in the Data returns online (England) service:';
sendPinTemplate += '{{pin}}';
sendPinTemplate += "Once we've confirmed your email address, you can send your data return file saved as CSV We'll send a receipt to this email address.";
sendPinTemplate += footer;


var confirmationEmailTemplate = "You successfully sent a data return online to the Environment Agency.";
confirmationEmailTemplate += "Your details:";
confirmationEmailTemplate += "File: {{FILENAME}}";
confirmationEmailTemplate += "Date: {{DATE}}";
confirmationEmailTemplate += "Time: {{TIME}}";
confirmationEmailTemplate += "We’ll now check it for quality and regulatory compliance. We may need to contact you with any queries about the data in your returns.";
confirmationEmailTemplate += "You can use the service to send another data return online.";
confirmationEmailTemplate += "Send us feedback to help us improve this new service.";
confirmationEmailTemplate += footer;

module.exports.confirmationEmailTemplate = confirmationEmailTemplate;

module.exports.sendPinTemplate = sendPinTemplate;



  