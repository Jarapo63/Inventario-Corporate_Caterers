const express = require('express');
const router = express.Router();
const { submitReception, getReceptionAlerts, resolveReception, cancelReception, getCancelledReceptionReports, markCancelledAsOrdered, dropCancelledOrder } = require('../controllers/receptionController');
const { verifyToken, verifyRole } = require('../middleware/authMiddleware');

// Se ha actualizado para incluir Asistente y Subcheff en el permiso de Recepcionar mercancía y contrastar órdenes
router.post('/submit', verifyToken, verifyRole(['Admin', 'Manager', 'Manager_Drivers', 'Manager_Kitchen', 'Subcheff', 'Asistente']), submitReception);

router.get('/alerts', verifyToken, getReceptionAlerts);
router.post('/resolve', verifyToken, verifyRole(['Admin', 'Manager', 'Manager_Drivers', 'Manager_Kitchen', 'Subcheff', 'Asistente']), resolveReception);

// Nuevas rutas para cancelar y gestionar reportes de cancelaciones
router.post('/cancel', verifyToken, verifyRole(['Admin', 'Manager', 'Manager_Drivers', 'Manager_Kitchen', 'Subcheff', 'Asistente']), cancelReception);
router.get('/cancelled', verifyToken, verifyRole(['Admin', 'Manager', 'Manager_Drivers', 'Manager_Kitchen', 'Subcheff', 'Asistente']), getCancelledReceptionReports);
router.post('/cancelled/resolve', verifyToken, verifyRole(['Admin', 'Manager', 'Manager_Drivers', 'Manager_Kitchen', 'Subcheff', 'Asistente']), markCancelledAsOrdered);
router.post('/cancelled/drop', verifyToken, verifyRole(['Admin', 'Manager', 'Manager_Drivers', 'Manager_Kitchen', 'Subcheff', 'Asistente']), dropCancelledOrder);

module.exports = router;
