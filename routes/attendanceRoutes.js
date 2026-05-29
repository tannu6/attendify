var express = require('express');
var router = express.Router();

router.get('/', function(req, res) {
    res.json({ message: 'Attendance endpoint is under construction' });
});

module.exports = router;
