var express = require('express');
var router = express.Router();
var certificateController = require('../controllers/certificateController');
var upload = require('../config/bulkUploadConfig');

router.get('/', certificateController.certificateRoot);
router.post('/issue', certificateController.issueCertificate);
router.post('/bulk', upload.single('file'), certificateController.bulkIssueCertificates);
router.get('/verify/:code', certificateController.verifyCertificate);
router.get('/download/:code', certificateController.downloadCertificate);

module.exports = router;
