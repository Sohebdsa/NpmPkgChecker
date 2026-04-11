const express = require('express');
const router = express.Router();
const scanController = require('../controllers/scanController');

router.post('/scan', scanController.scanPackage);

module.exports = router;
