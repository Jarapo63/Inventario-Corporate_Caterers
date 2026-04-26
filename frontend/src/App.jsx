import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
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

const ProtectedRoute = ({ isAuthenticated, allowedRoles, children }) => {
  const role = (localStorage.getItem('userRole') || '').trim().toLowerCase();

  if (!isAuthenticated) {
    return <Navigate to="/" />;
  }

  if (allowedRoles) {
    const normalizedAllowed = allowedRoles.map(r => r.toLowerCase());
    if (!normalizedAllowed.includes(role)) {
      toast.error(`Acceso denegado: Tu rol no tiene permisos para esta sección.`);
      return <Navigate to="/dashboard" />;
    }
  }

  return children;
};

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
        
        <Route path="/dashboard" element={
          <ProtectedRoute isAuthenticated={isAuthenticated} allowedRoles={['Admin', 'Manager', 'Asistente', 'Subcheff']}>
            <Dashboard setAuth={setIsAuthenticated} />
          </ProtectedRoute>
        } />
        
        <Route path="/capture" element={
          <ProtectedRoute isAuthenticated={isAuthenticated} allowedRoles={['Admin', 'Manager']}>
            <InventoryCapture />
          </ProtectedRoute>
        } />
        
        <Route path="/manage" element={
          <ProtectedRoute isAuthenticated={isAuthenticated} allowedRoles={['Admin', 'Asistente']}>
            <ProductManager />
          </ProtectedRoute>
        } />
        
        <Route path="/reception" element={
          <ProtectedRoute isAuthenticated={isAuthenticated} allowedRoles={['Admin', 'Manager', 'Asistente', 'Subcheff']}>
            <Reception />
          </ProtectedRoute>
        } />
        
        <Route path="/analytics" element={
          <ProtectedRoute isAuthenticated={isAuthenticated} allowedRoles={['Admin']}>
            <Analytics />
          </ProtectedRoute>
        } />
        
        <Route path="/reports/orders" element={
          <ProtectedRoute isAuthenticated={isAuthenticated} allowedRoles={['Admin']}>
            <ReportsOrders />
          </ProtectedRoute>
        } />
        
        <Route path="/reports/cancelled" element={
          <ProtectedRoute isAuthenticated={isAuthenticated} allowedRoles={['Admin']}>
            <CancelledReports />
          </ProtectedRoute>
        } />
        
        <Route path="/providers" element={
          <ProtectedRoute isAuthenticated={isAuthenticated} allowedRoles={['Admin', 'Asistente']}>
            <ProviderManager />
          </ProtectedRoute>
        } />
        
        <Route path="/users" element={
          <ProtectedRoute isAuthenticated={isAuthenticated} allowedRoles={['Admin']}>
            <UserManager />
          </ProtectedRoute>
        } />
        
      </Routes>
    </Router>
  );
}

export default App;
