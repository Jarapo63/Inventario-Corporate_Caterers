const express = require('express');
const router = express.Router();
const { updateProduct, addProduct, insertProduct } = require('../controllers/catalogController');
const { verifyToken, verifyRole } = require('../middleware/authMiddleware');

// Administradores y Asistentes pueden mutar los catálogos maestros
router.put('/update', verifyToken, verifyRole(['Admin', 'Asistente']), updateProduct);
router.post('/add', verifyToken, verifyRole(['Admin', 'Asistente']), addProduct);
router.post('/insert', verifyToken, verifyRole(['Admin', 'Asistente']), insertProduct);

module.exports = router;
