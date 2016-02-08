

/*
 * Contains the email template for sending pin numbers
 * NOTE: SMTP Server config is in the seperate environment configs
 */

var footer = '<br>The Environment Agency<br>';
footer += '<br>Telephone: 03708 506 506<br>';
footer += '<br>Telephone from outside the UK: 00 44 1709 389 201<br>';
footer += '(Mon to Fri, 8am to 6pm)<br>';
footer += '<br>Minicom service, for the hard of hearing: 03702 422 549 National Customer Contact Centre.<br>';
footer += 'Details of call charges can be found on the GOV.UK website<br>';
footer += '<br>Email address: enquiries@environment-agency.gov.uk<br>';

var sendPinTemplate = 'You requested a pin from the Environment Agency to make a data return.<br>';
sendPinTemplate += '<br>Go to your browser and use this code to confirm your email address in the Data returns online (England) service:<br>';
sendPinTemplate += '<br>{{pin}}<br>';
sendPinTemplate += "<br>Once we've confirmed your email address, you can send your data return file saved as CSV We'll send a receipt to this email address.<br>";
sendPinTemplate += footer;


var confirmationEmailTemplate = "<br>You successfully sent a data return online to the Environment Agency.<br>";
confirmationEmailTemplate += "<br>Your details:<br>";
confirmationEmailTemplate += "<br>File: {{FILENAME}}<br>";
confirmationEmailTemplate += "Date: {{DATE}}<br>";
confirmationEmailTemplate += "Time: {{TIME}}<br>";
confirmationEmailTemplate += "<br>We’ll now check it for quality and regulatory compliance. We may need to contact you with any queries about the data in your returns.<br>";
confirmationEmailTemplate += "<br>You can use the service to send another data return online.<br>";
confirmationEmailTemplate += "<br>Send us feedback to help us improve this new service.<br>";
confirmationEmailTemplate += footer;

module.exports.confirmationEmailTemplate = confirmationEmailTemplate;

module.exports.sendPinTemplate = sendPinTemplate;



  