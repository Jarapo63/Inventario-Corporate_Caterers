const express = require('express');
const router = express.Router();
const { getPendingOrders, getOrderDetails, captureOrderProduct, updateOrderQuantity } = require('../controllers/purchaseController');
const { verifyToken, verifyRole } = require('../middleware/authMiddleware');

router.get('/orders', verifyToken, verifyRole(['Admin', 'Manager', 'Manager_Drivers', 'Manager_Kitchen', 'Asistente', 'Subcheff']), getPendingOrders);
router.get('/orders/:orderId', verifyToken, verifyRole(['Admin', 'Manager', 'Manager_Drivers', 'Manager_Kitchen', 'Asistente', 'Subcheff']), getOrderDetails);
router.post('/capture', verifyToken, verifyRole(['Admin', 'Manager', 'Manager_Drivers', 'Manager_Kitchen']), captureOrderProduct);
router.put('/orders/update-quantity', verifyToken, verifyRole(['Admin']), updateOrderQuantity);

module.exports = router;
