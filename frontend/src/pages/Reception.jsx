import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Loader2, PackageCheck } from 'lucide-react';
import { fetchPendingOrders, fetchOrderDetails, submitReception } from '../utils/api';
import { toast } from 'react-hot-toast';

const Reception = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [orderDetails, setOrderDetails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [receivedQty, setReceivedQty] = useState({});

  useEffect(() => {
    loadOrders();
  }, []);

  useEffect(() => {
    if (selectedOrderId) {
      loadOrderDetails(selectedOrderId);
    } else {
      setOrderDetails([]);
    }
  }, [selectedOrderId]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const { data } = await fetchPendingOrders();
      setOrders(data);
      if (data && data.length > 0) {
        setSelectedOrderId(data[0].id); // Selecciona la más reciente
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadOrderDetails = async (orderId) => {
    try {
      setLoading(true);
      setReceivedQty({});
      const { data } = await fetchOrderDetails(orderId);
      setOrderDetails(data || []);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleQuantityChange = (key, value) => {
    setReceivedQty(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    
    const receptionData = Object.entries(receivedQty).map(([idx, qty]) => {
      const row = orderDetails[parseInt(idx)];
      return {
        orderId: selectedOrderId,
        idProducto: row.ID_Producto,
        nombreProducto: row.Producto,
        orden: row.Orden,
        recibido: qty
      };
    }).filter(i => i.recibido !== undefined && i.recibido !== '');

    if (receptionData.length === 0) {
      toast.error('No has introducido ninguna cantidad para recepcionar.');
      setSaving(false);
      return;
    }

    try {
      const result = await submitReception(receptionData);
      toast.success(result.message); 
      setReceivedQty({});
      navigate('/dashboard');
    } catch (err) {
      toast.error('Error guardando: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading && orders.length === 0) {
    return (
      <div className="container">
        <Loader2 className="animate-spin" color="var(--primary)" size={48} />
      </div>
    );
  }

  // Agrupar por proveedor
  const groupedByProvider = orderDetails.reduce((acc, item, index) => {
    const prov = item.Proveedor || 'Sin Proveedor';
    if (!acc[prov]) acc[prov] = [];
    acc[prov].push({ ...item, originalIndex: index });
    return acc;
  }, {});

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100%' }}>
      <nav className="glass-panel" style={{ borderRadius: 0, borderTop: 0, borderLeft: 0, borderRight: 0, padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 50 }}>
        <button onClick={() => navigate('/dashboard')} style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer', padding: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ArrowLeft size={20} />
          <span>Volver</span>
        </button>
        <h2 style={{ margin: 0, fontSize: '1.2rem', textAlign: 'center' }}>Recepción de Pedidos</h2>
        <button 
          onClick={handleSave} 
          disabled={saving || Object.keys(receivedQty).length === 0} 
          style={{ background: 'var(--accent)', border: 'none', color: 'white', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: saving || Object.keys(receivedQty).length === 0 ? 0.7 : 1 }}
        >
          <Save size={18} />
          <span>{saving ? '...' : 'Procesar'}</span>
        </button>
      </nav>

      {/* Selector de Órdenes */}
      <div style={{ padding: '1rem 1rem 0 1rem' }}>
        <div className="glass-panel" style={{ padding: '1rem', border: '1px solid var(--primary)' }}>
          <label style={{ margin: '0 0 0.5rem 0', color: 'var(--text-main)', fontSize: '0.95rem' }}>Seleccionar Orden en Tránsito:</label>
          <select 
            className="input-field" 
            value={selectedOrderId} 
            onChange={e => setSelectedOrderId(e.target.value)}
            style={{ fontWeight: 'bold', border: '1px solid var(--primary)', backgroundColor: 'var(--bg-dark)' }}
          >
            {orders.length === 0 ? (
              <option value="">No hay pedidos pendientes actualmente</option>
            ) : (
              orders.map(o => (
                <option key={o.id} value={o.id}>
                  {o.id} - Registrado el {new Date(o.fecha).toLocaleDateString()} por {o.usuario}
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      {/* Lista Agrupada por Proveedor */}
      <main style={{ flex: 1, padding: '1rem', overflowY: 'auto' }}>
        {orders.length === 0 ? (
          <div className="glass-panel" style={{ padding: '3rem 1rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', marginTop: '1rem' }}>
            <PackageCheck size={48} color="var(--text-muted)" />
            <h3 style={{ margin: 0 }}>No hay Órdenes Pendientes</h3>
            <p style={{ color: 'var(--text-muted)', margin: 0 }}>En este momento no existen hojas de pedidos que deban ser procesadas o cotejadas contra proveedores.</p>
          </div>
        ) : loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
            <Loader2 className="animate-spin" color="var(--primary)" size={32} />
          </div>
        ) : (
          Object.keys(groupedByProvider).map(provider => (
            <div key={provider} style={{ marginBottom: '2.5rem' }}>
              <h3 style={{ borderBottom: '2px solid var(--border-color)', paddingBottom: '0.5rem', color: '#fbbf24', position: 'sticky', top: '-1rem', background: 'var(--bg-dark)', zIndex: 10, textTransform: 'uppercase', letterSpacing: '1px' }}>
                Proveedor: {provider}
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {groupedByProvider[provider].map(item => {
                  const actualIdx = item.originalIndex;
                  return (
                    <div key={actualIdx} className="glass-panel" style={{ padding: '1rem', display: 'flex', justifyContent: 'flex-start', alignItems: 'center', gap: '1.5rem', borderLeft: '4px solid var(--accent)' }}>
                      <div style={{ flex: '0 1 auto', maxWidth: '75%' }}>
                        <span style={{ display: 'block', fontWeight: 600, fontSize: '1.1rem', lineHeight: '1.3' }}>{item.Producto || 'Sin Nombre'}</span>
                        <span style={{ fontSize: '0.95rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.4rem' }}>
                          ID: {item.ID_Producto} | Id_Prod_Prov: {item.Id_Prod_Prov || '-'} | Área: {item['Área'] || item.Area} <br/>
                          <span style={{ color: 'var(--primary)', fontWeight: 700, fontSize: '1rem', display: 'inline-block', marginTop: '0.2rem' }}>Esperado: {Math.ceil(parseFloat(item.Orden) || 0)}</span>
                        </span>
                      </div>
                      <div style={{ flex: '0 0 110px' }}>
                        <input 
                          type="number" 
                          min="0"
                          step="1"
                          placeholder="Recibió"
                          className="input-field" 
                          style={{ marginTop: 0, textAlign: 'center', padding: '0.5rem', fontSize: '1.1rem', background: 'rgba(255,255,255,0.05)' }}
                          value={receivedQty[actualIdx] || ''}
                          onChange={(e) => handleQuantityChange(actualIdx, e.target.value)}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </main>
    </div>
  );
};

export default Reception;
