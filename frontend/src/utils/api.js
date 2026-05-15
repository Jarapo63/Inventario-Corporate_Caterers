const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Authentication
export const loginUser = async (username, password) => {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Error en autenticación');
  return data;
};

// Helper for protected requests
export const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : ''
  };
};

// User Management (Admin Only)
export const fetchUsers = async () => {
  const res = await fetch(`${API_URL}/auth/users`, { headers: getAuthHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message);
  return data;
};

export const addUserAdmin = async (userData) => {
  const res = await fetch(`${API_URL}/auth/users`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(userData)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message);
  return data;
};

export const updateUserAdmin = async (rowNum, userData) => {
  const res = await fetch(`${API_URL}/auth/users/${rowNum}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(userData)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message);
  return data;
};

export const deleteUserAdmin = async (rowNum) => {
  const res = await fetch(`${API_URL}/auth/users/${rowNum}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message);
  return data;
};

// Inventory
export const fetchCatalog = async () => {
  const res = await fetch(`${API_URL}/inventory`, { headers: getAuthHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Error cargando catálogo');
  return data;
};

// Catalog Master
export const updateProduct = async (sheetName, rowNum, newValues, priceMetadata = null) => {
  const res = await fetch(`${API_URL}/catalog/update`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ sheetName, rowNum, newValues, ...priceMetadata })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Error actualizando producto');
  return data;
};

export const addProduct = async (sheetName, newValues) => {
  const res = await fetch(`${API_URL}/catalog/add`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ sheetName, newValues })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Error añadiendo producto');
  return data;
};

export const insertProduct = async (sheetName, targetRowNum, newValues, inactivatePrevious) => {
  const res = await fetch(`${API_URL}/catalog/insert`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ sheetName, targetRowNum, newValues, inactivatePrevious })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Error insertando producto posicionalmente');
  return data;
};

export const submitInventory = async (inventoryData, type, orderId) => {
  const res = await fetch(`${API_URL}/inventory/submit`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ inventoryData, type, orderId })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Error guardando captura');
  return data;
};

// Reception
export const submitReception = async (receptionData) => {
  const res = await fetch(`${API_URL}/reception/submit`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ receptionData })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Error procesando recepción');
  return data;
};

export const fetchReceptionAlerts = async () => {
  const res = await fetch(`${API_URL}/reception/alerts`, { headers: getAuthHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message);
  return data;
};

export const resolveReceptionAlert = async (orderId, productId, newReceived) => {
  const res = await fetch(`${API_URL}/reception/resolve`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ orderId, productId, newReceived })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message);
  return data;
};

export const cancelReceptionAlert = async (orderId, productId) => {
  const res = await fetch(`${API_URL}/reception/cancel`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ orderId, productId })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message);
  return data;
};

export const fetchCancelledAlerts = async () => {
  const res = await fetch(`${API_URL}/reception/cancelled`, { headers: getAuthHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message);
  return data;
};

export const markCancelledAsOrdered = async (orderId, productId) => {
  const res = await fetch(`${API_URL}/reception/cancelled/resolve`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ orderId, productId })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message);
  return data;
};

export const dropCancelledAlert = async (orderId, productId) => {
  const res = await fetch(`${API_URL}/reception/cancelled/drop`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ orderId, productId })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message);
  return data;
};

// Financial & Analytics
export const fetchMonthlyOrders = async () => {
  const res = await fetch(`${API_URL}/finance/monthly-orders`, { headers: getAuthHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message);
  return data;
};

export const fetchPriceFluctuation = async () => {
  const res = await fetch(`${API_URL}/finance/price-fluctuation`, { headers: getAuthHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message);
  return data;
};

export const fetchWeeklyCost = async () => {
  const res = await fetch(`${API_URL}/finance/weekly-cost`, { headers: getAuthHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message);
  return data;
};

export const fetchInventoryMovements = async () => {
  const res = await fetch(`${API_URL}/finance/inventory-movements`, { headers: getAuthHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message);
  return data;
};

export const fetchProviderReconciliation = async () => {
  const res = await fetch(`${API_URL}/finance/provider-reconciliation`, { headers: getAuthHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message);
  return data;
};

// Purchase Orders
export const fetchPendingOrders = async () => {
  const res = await fetch(`${API_URL}/purchase/orders`, { headers: getAuthHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message);
  return data;
};

export const fetchOrderDetails = async (orderId) => {
  const res = await fetch(`${API_URL}/purchase/orders/${orderId}`, { headers: getAuthHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message);
  return data;
};

export const markOrderCaptured = async (orderId, productId, isCaptured) => {
  const res = await fetch(`${API_URL}/purchase/capture`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ orderId, productId, isCaptured })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message);
  return data;
};

export const updateOrderQuantity = async (orderId, productId, newQuantity) => {
  const res = await fetch(`${API_URL}/purchase/orders/update-quantity`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ orderId, productId, newQuantity })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message);
  return data;
};

// Providers
export const fetchProviders = async () => {
  const res = await fetch(`${API_URL}/providers`, { headers: getAuthHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message);
  return data;
};

export const addProvider = async (providerData) => {
  const res = await fetch(`${API_URL}/providers`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(providerData)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message);
  return data;
};

export const updateProvider = async (rowNum, providerData) => {
  const res = await fetch(`${API_URL}/providers/${rowNum}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(providerData)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message);
  return data;
};
