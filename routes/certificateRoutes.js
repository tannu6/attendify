var express = require('express');
var router = express.Router();
var certificateController = require('../controllers/certificateController');

router.post('/issue', certificateController.issueCertificate);
router.get('/verify/:code', certificateController.verifyCertificate);
router.get('/download/:code', certificateController.downloadCertificate);

module.exports = router;
