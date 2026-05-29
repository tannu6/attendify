var express = require('express');
var router = express.Router();
var eventController = require('../controllers/eventController');

router.get('/', eventController.listEvents);
router.post('/create', eventController.createEvent);
router.get('/:id', eventController.getEvent);

module.exports = router;
