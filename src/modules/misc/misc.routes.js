const express = require('express');
const { getFrontendConfig } = require('./misc.controller');
const router = express.Router();

router.get('/config', getFrontendConfig);

module.exports = router;