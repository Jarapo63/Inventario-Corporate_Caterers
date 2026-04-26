const express = require('express');
const router = express.Router();
const { 
  freezePrices, 
  getMonthlyOrders, 
  getPriceFluctuation, 
  getWeeklyCost, 
  getInventoryMovements 
} = require('../controllers/financialController');
const { verifyToken, verifyRole } = require('../middleware/authMiddleware');

router.post('/freeze', verifyToken, verifyRole(['Admin']), freezePrices);
router.get('/monthly-orders', verifyToken, verifyRole(['Admin']), getMonthlyOrders);
router.get('/price-fluctuation', verifyToken, verifyRole(['Admin']), getPriceFluctuation);
router.get('/weekly-cost', verifyToken, verifyRole(['Admin']), getWeeklyCost);
router.get('/inventory-movements', verifyToken, verifyRole(['Admin']), getInventoryMovements);

module.exports = router;
