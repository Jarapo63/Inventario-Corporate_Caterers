const express = require('express');
const router = express.Router();
const { getProviders, addProvider, updateProvider } = require('../controllers/providerController');

// All routes are mounted under /api/providers
router.get('/', getProviders);
router.post('/', addProvider);
router.put('/:rowNum', updateProvider);

module.exports = router;
