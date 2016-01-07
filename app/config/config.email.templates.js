

/*
 * Contains the email template for sending pin numbers
 * NOTE: SMTP Server config is in the seperate environment configs
 */



var sendPinTemplate = 'You requested a pin from the Environment Agency to make a data return.<br>';

sendPinTemplate += '<br>Go to your browser and use this code to confirm your email address in the Data returns online (England) service:<br>';

sendPinTemplate += '<br>{{pin}}<br>';

sendPinTemplate += "<br>Once we've confirmed your email address, you can send your data return file saved as CSV We'll send a receipt to this email address.<br>";

sendPinTemplate += '<br>The Environment Agency<br>';

sendPinTemplate += '<br>Telephone: 03708 506 506<br>';

sendPinTemplate += '<br>Telephone from outside the UK: 00 44 1709 389 201<br>';
sendPinTemplate += '(Mon to Fri, 8am to 6pm)<br>';

sendPinTemplate += '<br>Minicom service, for the hard of hearing: 03702 422 549 National Customer Contact Centre.<br>';
sendPinTemplate += 'Details of call charges can be found on the GOV.UK website<br>';

sendPinTemplate += '<br>Email address: enquiries@environment - agency.gov.uk<br>';


var confirmationEmailTemplate = 'Your file has been recieved ';

module.exports.confirmationEmailTemplate = confirmationEmailTemplate;

module.exports.sendPinTemplate = sendPinTemplate;



  