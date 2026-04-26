const express = require('express');
const router = express.Router();
const { updateProduct, addProduct } = require('../controllers/catalogController');
const { verifyToken, verifyRole } = require('../middleware/authMiddleware');

// Administradores y Asistentes pueden mutar los catálogos maestros
router.put('/update', verifyToken, verifyRole(['Admin', 'Asistente']), updateProduct);
router.post('/add', verifyToken, verifyRole(['Admin', 'Asistente']), addProduct);

module.exports = router;
