var nodemailer = require('nodemailer');
var transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});
var mailOptions = {
    from: process.env.EMAIL_USER,
    to: '',
    subject: '',
    html: ''
};

var sendMail = function(to, subject, html, callback) {
    mailOptions.to = to;
    mailOptions.subject = subject;
    mailOptions.html = html;
    
    transporter.sendMail(mailOptions, function(error, info) {
        if (error) {
            console.log(error);
            callback(error);
        } else {
            console.log('Email sent: ' + info.response);
            callback(null, info);
        }
    });
};

module.exports = { transporter, sendMail };
