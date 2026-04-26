const express = require('express');
const router = express.Router();
const { submitReception, getReceptionAlerts, resolveReception, cancelReception, getCancelledReceptionReports, markCancelledAsOrdered, dropCancelledOrder } = require('../controllers/receptionController');
const { verifyToken, verifyRole } = require('../middleware/authMiddleware');

// Solo Manager, Admin, y Subcheff tienen permiso de Recepcionar mercancía y contrastar órdenes
router.post('/submit', verifyToken, verifyRole(['Admin', 'Manager', 'Subcheff']), submitReception);

router.get('/alerts', verifyToken, getReceptionAlerts);
router.post('/resolve', verifyToken, verifyRole(['Admin', 'Manager', 'Subcheff']), resolveReception);

// Nuevas rutas para cancelar y gestionar reportes de cancelaciones
router.post('/cancel', verifyToken, verifyRole(['Admin', 'Manager', 'Subcheff']), cancelReception);
router.get('/cancelled', verifyToken, verifyRole(['Admin', 'Manager', 'Subcheff']), getCancelledReceptionReports);
router.post('/cancelled/resolve', verifyToken, verifyRole(['Admin', 'Manager', 'Subcheff']), markCancelledAsOrdered);
router.post('/cancelled/drop', verifyToken, verifyRole(['Admin', 'Manager', 'Subcheff']), dropCancelledOrder);

module.exports = router;
