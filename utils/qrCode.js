var QRCode = require('qrcode');

var generateQRCode = function(data, outputPath) {
    return new Promise(function(resolve, reject) {
        QRCode.toFile(outputPath, data, { type: 'png', width: 300 }, function(err) {
            if (err) {
                return reject(err);
            }
            resolve(outputPath);
        });
    });
};

module.exports = { generateQRCode };
