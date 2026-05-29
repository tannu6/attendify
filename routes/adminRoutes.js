var express = require('express');
var router = express.Router();
var adminController = require('../controllers/adminController');

router.get('/', adminController.adminRoot);
router.get('/dashboard', adminController.dashboard);
router.get('/logs', adminController.certificateLogs);

module.exports = router;
