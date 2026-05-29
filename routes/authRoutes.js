var express = require('express');
var router = express.Router();
var authController = require('../controllers/authController');

router.get('/', authController.authRoot);
router.get('/login', authController.loginPage);
router.get('/register', authController.registerPage);
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/logout', authController.logout);

module.exports = router;
