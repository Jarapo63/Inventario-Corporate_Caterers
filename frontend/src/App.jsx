import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import InventoryCapture from './pages/InventoryCapture';
import ProductManager from './pages/ProductManager';
import Reception from './pages/Reception';
import Analytics from './pages/Analytics';
import ReportsOrders from './pages/ReportsOrders';
import ProviderManager from './pages/ProviderManager';
import CancelledReports from './pages/CancelledReports';
import UserManager from './pages/UserManager';
import './index.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) setIsAuthenticated(true);
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/" element={isAuthenticated ? <Navigate to="/dashboard" /> : <Login setAuth={setIsAuthenticated} />} />
        <Route path="/dashboard" element={isAuthenticated ? <Dashboard setAuth={setIsAuthenticated} /> : <Navigate to="/" />} />
        <Route path="/capture" element={isAuthenticated ? <InventoryCapture /> : <Navigate to="/" />} />
        <Route path="/manage" element={isAuthenticated ? <ProductManager /> : <Navigate to="/" />} />
        <Route path="/reception" element={isAuthenticated ? <Reception /> : <Navigate to="/" />} />
        <Route path="/analytics" element={isAuthenticated ? <Analytics /> : <Navigate to="/" />} />
        <Route path="/reports/orders" element={isAuthenticated ? <ReportsOrders /> : <Navigate to="/" />} />
        <Route path="/reports/cancelled" element={isAuthenticated ? <CancelledReports /> : <Navigate to="/" />} />
        <Route path="/providers" element={isAuthenticated ? <ProviderManager /> : <Navigate to="/" />} />
        <Route path="/users" element={isAuthenticated ? <UserManager /> : <Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;
