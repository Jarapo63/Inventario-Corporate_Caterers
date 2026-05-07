const express = require('express');
const router = express.Router();
const { getCatalog, submitInventory } = require('../controllers/inventoryController');
const { verifyToken, verifyRole } = require('../middleware/authMiddleware');

// Solo usuarios autenticados pueden ver el inventario
router.get('/', verifyToken, getCatalog);

// Solo Managers y Admins pueden cerrar el ciclo de inventario (Submit)
router.post('/submit', verifyToken, verifyRole(['Admin', 'Manager', 'Manager_Drivers', 'Manager_Kitchen']), submitInventory);

module.exports = router;
