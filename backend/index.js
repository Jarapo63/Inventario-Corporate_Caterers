const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors());
app.use(express.json());

// Main Routes
app.use('/api/auth', authRoutes);

const inventoryRoutes = require('./routes/inventoryRoutes');
app.use('/api/inventory', inventoryRoutes);

const purchaseRoutes = require('./routes/purchaseRoutes');
app.use('/api/purchase', purchaseRoutes);

const financialRoutes = require('./routes/financialRoutes');
app.use('/api/finance', financialRoutes);

const catalogRoutes = require('./routes/catalogRoutes');
app.use('/api/catalog', catalogRoutes);

const providerRoutes = require('./routes/providerRoutes');
app.use('/api/providers', providerRoutes);

const receptionRoutes = require('./routes/receptionRoutes');
app.use('/api/reception', receptionRoutes);

// Basic Route for Health Check
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Backend is running' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
