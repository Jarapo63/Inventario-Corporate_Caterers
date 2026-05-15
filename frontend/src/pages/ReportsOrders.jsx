import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchMonthlyOrders, markOrderCaptured, updateOrderQuantity } from '../utils/api';
import { Edit2, Check, X, ClipboardList, ArrowLeft } from 'lucide-react';

const ReportsOrders = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [filterType, setFilterType] = useState('Sem'); // 'Sem' o 'Ext'
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [filterOrderId, setFilterOrderId] = useState('ALL');
  const [capturingRows, setCapturingRows] = useState(new Set());
  
  const [editingQuantities, setEditingQuantities] = useState({});
  const [editFormQuantities, setEditFormQuantities] = useState({});
  const [isSavingQty, setIsSavingQty] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.role === 'Admin') setIsAdmin(true);
      } catch (e) {}
    }
    const loadOrders = async () => {
      try {
        const res = await fetchMonthlyOrders();
        setOrders(res.data || []);
      } catch (error) {
        console.error("Error al cargar órdenes:", error);
      } finally {
        setLoading(false);
      }
    };
    loadOrders();
  }, []);

  const handleCaptureToggle = async (row) => {
    const rowKey = `${row.ID_Pedido}-${row.ID_Producto}`;
    if (capturingRows.has(rowKey)) return;
    
    // Optimistic Update
    const isCaptured = row.Capturado === 'TRUE';
    const newCapturedState = isCaptured ? 'FALSE' : 'TRUE';
    
    setOrders(prev => prev.map(o => 
      (o.ID_Pedido === row.ID_Pedido && o.ID_Producto === row.ID_Producto) 
      ? { ...o, Capturado: newCapturedState } 
      : o
    ));
    
    setCapturingRows(prev => new Set(prev).add(rowKey));
    try {
      await markOrderCaptured(row.ID_Pedido, row.ID_Producto, newCapturedState === 'TRUE');
    } catch (error) {
      console.error("Error al actualizar captura:", error);
      // Revert if failed
      setOrders(prev => prev.map(o => 
        (o.ID_Pedido === row.ID_Pedido && o.ID_Producto === row.ID_Producto) 
        ? { ...o, Capturado: isCaptured ? 'TRUE' : 'FALSE' } 
        : o
      ));
    } finally {
      setCapturingRows(prev => {
        const newSet = new Set(prev);
        newSet.delete(rowKey);
        return newSet;
      });
    }
  };

  const handleEditClick = (row) => {
    const rowKey = `${row.ID_Pedido}-${row.ID_Producto}`;
    setEditingQuantities(prev => ({ ...prev, [rowKey]: true }));
    setEditFormQuantities(prev => ({ ...prev, [rowKey]: row.Orden || '0' }));
  };

  const handleCancelEdit = (row) => {
    const rowKey = `${row.ID_Pedido}-${row.ID_Producto}`;
    setEditingQuantities(prev => ({ ...prev, [rowKey]: false }));
  };

  const handleSaveEdit = async (row) => {
    const rowKey = `${row.ID_Pedido}-${row.ID_Producto}`;
    const newQtyStr = editFormQuantities[rowKey];
    const newQty = parseInt(newQtyStr, 10);
    
    if (isNaN(newQty) || newQty < 0) {
      alert("Por favor ingrese una cantidad válida (mayor o igual a 0).");
      return;
    }

    setIsSavingQty(true);
    try {
      await updateOrderQuantity(row.ID_Pedido, row.ID_Producto, newQty);
      
      const newCost = newQty * parseFloat(row.Precio || 0);
      
      setOrders(prev => prev.map(o => 
        (o.ID_Pedido === row.ID_Pedido && o.ID_Producto === row.ID_Producto) 
        ? { ...o, Orden: String(newQty), Costo: String(newCost) } 
        : o
      ));
      
      handleCancelEdit(row);
    } catch (error) {
      console.error("Error al actualizar cantidad:", error);
      alert("Error al actualizar cantidad. Revisa la consola.");
    } finally {
      setIsSavingQty(false);
    }
  };

  const baseFiltered = orders.filter(item => {
    if (!(item.ID_Pedido || '').startsWith(filterType)) return false;
    
    // Filtros de fecha
    if (filterMonth !== 'ALL' || filterYear !== 'ALL') {
      const d = item.Fecha ? new Date(item.Fecha) : null;
      if (!d) return false;
      if (filterMonth !== 'ALL' && (d.getMonth() + 1) !== parseInt(filterMonth)) return false;
      if (filterYear !== 'ALL' && d.getFullYear() !== parseInt(filterYear)) return false;
    }
    return true;
  });

  const availableOrderIds = [...new Set(baseFiltered.map(o => o.ID_Pedido))].sort((a,b) => b.localeCompare(a));

  const filteredOrders = baseFiltered.filter(item => {
    if (filterOrderId !== 'ALL' && item.ID_Pedido !== filterOrderId) return false;
    return true;
  }).sort((a, b) => {
    // Primero ordenamos por ID_Pedido (los más recientes primero)
    const idCompare = (b.ID_Pedido || '').localeCompare(a.ID_Pedido || '');
    if (idCompare !== 0) return idCompare;
    
    // Segundo ordenamos por Proveedor alfabéticamente
    const provA = a.Proveedor || 'Sin Proveedor';
    const provB = b.Proveedor || 'Sin Proveedor';
    return provA.localeCompare(provB);
  });

  const uniqueOrdersCount = new Set(filteredOrders.map(o => o.ID_Pedido)).size;
  const totalCost = filteredOrders.reduce((sum, row) => sum + (parseFloat(row['Costo']) || 0), 0);
  
  const costByProvider = filteredOrders.reduce((acc, row) => {
    const prov = row.Proveedor || 'Sin Proveedor';
    acc[prov] = (acc[prov] || 0) + (parseFloat(row['Costo']) || 0);
    return acc;
  }, {});

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100%' }}>
      {/* Navbar */}
      <nav className="glass-panel" style={{ borderRadius: 0, borderTop: 0, borderLeft: 0, borderRight: 0, padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <ClipboardList color="var(--primary)" />
          <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Reporte de Pedidos</h2>
        </div>
        <button className="btn-primary" style={{ width: 'auto' }} onClick={() => navigate('/dashboard')}>
           <ArrowLeft size={16} style={{ marginRight: '0.5rem' }}/> Volver al Dashboard
        </button>
      </nav>

      {/* Main Content */}
      <main style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
        <div className="glass-panel" style={{ padding: '1rem 2rem', marginBottom: '2rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button 
               className={filterType === 'Sem' ? 'btn-primary' : 'btn-secondary'} 
               style={{ width: 'auto', padding: '0.5rem 1.5rem', background: filterType === 'Sem' ? 'var(--primary)' : 'var(--bg-dark)' }} 
               onClick={() => { setFilterType('Sem'); setFilterOrderId('ALL'); }}>
              Pedidos Semanales
            </button>
            <button 
               className={filterType === 'Ext' ? 'btn-primary' : 'btn-secondary'} 
               style={{ width: 'auto', padding: '0.5rem 1.5rem', background: filterType === 'Ext' ? 'var(--danger)' : 'var(--bg-dark)' }} 
               onClick={() => { setFilterType('Ext'); setFilterOrderId('ALL'); }}>
              Pedidos Extraordinarios
            </button>
            <button 
               className={filterType === 'SR' ? 'btn-primary' : 'btn-secondary'} 
               style={{ width: 'auto', padding: '0.5rem 1.5rem', background: filterType === 'SR' ? 'var(--accent)' : 'var(--bg-dark)', color: filterType === 'SR' ? '#000' : 'white' }} 
               onClick={() => { setFilterType('SR'); setFilterOrderId('ALL'); }}>
              Pedidos Especiales (SR)
            </button>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginLeft: 'auto', flexWrap: 'wrap' }}>
            <select className="input-field" style={{ width: 'auto', margin: 0, padding: '0.5rem' }} value={filterMonth} onChange={(e) => { setFilterMonth(e.target.value); setFilterOrderId('ALL'); }}>
              <option value="ALL">Todo el Año</option>
              {['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'].map((m, i) => (
                <option key={m} value={i + 1}>{m}</option>
              ))}
            </select>
            
            <select className="input-field" style={{ width: 'auto', margin: 0, padding: '0.5rem' }} value={filterYear} onChange={(e) => { setFilterYear(e.target.value); setFilterOrderId('ALL'); }}>
              <option value="ALL">Todos los Años</option>
              {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            
            <select className="input-field" style={{ width: 'auto', minWidth: '180px', margin: 0, padding: '0.5rem', border: '1px solid var(--accent)' }} value={filterOrderId} onChange={(e) => setFilterOrderId(e.target.value)}>
              <option value="ALL">-- Todos los Pedidos --</option>
              {availableOrderIds.map(id => <option key={id} value={id}>{id}</option>)}
            </select>
          </div>
        </div>

        {filteredOrders.length > 0 && typeof totalCost !== 'undefined' && (
          <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            <div className="glass-panel" style={{ padding: '1.5rem', borderLeft: '4px solid var(--primary)' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Total de Pedidos</span>
              <h3 style={{ margin: '0.5rem 0 0 0', fontSize: '1.75rem', color: 'var(--text-main)' }}>{uniqueOrdersCount}</h3>
            </div>
            <div className="glass-panel" style={{ padding: '1.5rem', borderLeft: '4px solid var(--danger)' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Costo Proyectado Subtotal</span>
              <h3 style={{ margin: '0.5rem 0 0 0', fontSize: '1.75rem', color: 'var(--danger)' }}>${totalCost.toFixed(2)} USD</h3>
            </div>
            <div className="glass-panel" style={{ padding: '1.5rem', borderLeft: '4px solid var(--accent)' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem', display: 'block', marginBottom: '0.5rem' }}>Desglose por Proveedor</span>
              <div style={{ maxHeight: '70px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                {Object.entries(costByProvider).sort((a,b)=>b[1]-a[1]).map(([prov, cost]) => (
                   <div key={prov} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '0.35rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.2rem' }}>
                     <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>{prov}</span>
                     <span style={{ color: 'var(--accent)' }}>${cost.toFixed(2)}</span>
                   </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="glass-panel animate-fade-in" style={{ padding: '2rem', overflowX: 'auto' }}>
          {loading ? (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Cargando órdenes de compra...</p>
          ) : filteredOrders.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No hay pedidos ({filterType}) documentados aún.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '1rem', width: '60px', textAlign: 'center' }}>Check</th>
                  <th style={{ padding: '1rem' }}>ID Pedido</th>
                  <th style={{ padding: '1rem' }}>Usuario</th>
                  <th style={{ padding: '1rem' }}>Fecha</th>
                  <th style={{ padding: '1rem' }}>Proveedor</th>
                  <th style={{ padding: '1rem' }}>Id_Prod_Prov</th>
                  <th style={{ padding: '1rem' }}>Producto</th>
                  <th style={{ padding: '1rem', textAlign: 'center' }}>Cantidad Requerida</th>
                  <th style={{ padding: '1rem', textAlign: 'right' }}>Precio Unitario</th>
                  <th style={{ padding: '1rem', textAlign: 'right' }}>Costo Total</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((row, index) => {
                  const isCaptured = row.Capturado === 'TRUE';
                  const rowKey = `${row.ID_Pedido}-${row.ID_Producto}`;
                  const isLoad = capturingRows.has(rowKey);
                  return (
                  <tr key={index} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', backgroundColor: isCaptured ? 'rgba(0,0,0,0.2)' : 'transparent', opacity: isCaptured ? 0.6 : 1, transition: 'all 0.3s' }}>
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      <input 
                        type="checkbox" 
                        checked={isCaptured} 
                        onChange={() => handleCaptureToggle(row)}
                        disabled={isLoad}
                        style={{ transform: 'scale(1.5)', cursor: isLoad ? 'wait' : 'pointer', accentColor: 'var(--primary)' }} 
                      />
                    </td>
                    <td style={{ padding: '1rem', fontWeight: 'bold', color: 'var(--primary)', textDecoration: isCaptured ? 'line-through' : 'none' }}>{row.ID_Pedido}</td>
                    <td style={{ padding: '1rem', textDecoration: isCaptured ? 'line-through' : 'none' }}>{row.Usuario}</td>
                    <td style={{ padding: '1rem', fontSize: '0.9rem', textDecoration: isCaptured ? 'line-through' : 'none' }}>{new Date(row.Fecha).toLocaleDateString()}</td>
                    <td style={{ padding: '1rem', textDecoration: isCaptured ? 'line-through' : 'none' }}>{row.Proveedor}</td>
                    <td style={{ padding: '1rem', color: 'var(--accent)', textDecoration: isCaptured ? 'line-through' : 'none' }}>{row.Id_Prod_Prov || '-'}</td>
                    <td style={{ padding: '1rem', fontWeight: 500, textDecoration: isCaptured ? 'line-through' : 'none' }}>{row.Producto}</td>
                    <td style={{ padding: '1rem', textAlign: 'center', fontWeight: 'bold', fontSize: '1.1rem', textDecoration: isCaptured && !editingQuantities[rowKey] ? 'line-through' : 'none', minWidth: '160px' }}>
                      {editingQuantities[rowKey] ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                          <input 
                            type="number" 
                            min="0"
                            step="1"
                            className="input-field" 
                            style={{ margin: 0, width: '70px', padding: '0.3rem', textAlign: 'center' }}
                            value={editFormQuantities[rowKey] || ''}
                            onChange={(e) => setEditFormQuantities(prev => ({...prev, [rowKey]: e.target.value}))}
                            disabled={isSavingQty}
                          />
                          <button onClick={() => handleSaveEdit(row)} disabled={isSavingQty} style={{ background: 'transparent', border: 'none', color: '#4ade80', cursor: 'pointer', padding: '0.2rem' }}>
                            <Check size={18} />
                          </button>
                          <button onClick={() => handleCancelEdit(row)} disabled={isSavingQty} style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '0.2rem' }}>
                            <X size={18} />
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                          <span>{row.Orden}</span>
                          {isAdmin && !isCaptured && (
                            <button onClick={() => handleEditClick(row)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', opacity: 0.7 }} className="hover:opacity-100">
                              <Edit2 size={16} />
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right', color: 'var(--text-muted)', textDecoration: isCaptured ? 'line-through' : 'none' }}>${parseFloat(row['Precio'] || 0).toFixed(2)}</td>
                    <td style={{ padding: '1rem', textAlign: 'right', color: 'var(--danger)', fontWeight: 'bold', textDecoration: isCaptured ? 'line-through' : 'none' }}>${parseFloat(row['Costo'] || 0).toFixed(2)}</td>
                  </tr>
                )})}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
};

export default ReportsOrders;
