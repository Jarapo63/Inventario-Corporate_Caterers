import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, DollarSign, Calendar, Activity } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { fetchMonthlyOrders, fetchPriceFluctuation, fetchWeeklyCost, fetchInventoryMovements, fetchCatalog } from '../utils/api';

const Analytics = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [ordersData, setOrdersData] = useState([]);
  const [fluctuationData, setFluctuationData] = useState([]);
  const [costData, setCostData] = useState([]);
  const [movementsData, setMovementsData] = useState([]);

  const [filterType, setFilterType] = useState('Sem');
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [filterOrderId, setFilterOrderId] = useState('ALL');
  const [catalogMap, setCatalogMap] = useState({});
  const [areaMap, setAreaMap] = useState({});

  useEffect(() => {
    // Verificar rol Admin
    const role = localStorage.getItem('userRole');
    if (role !== 'Admin') {
      navigate('/dashboard');
      return;
    }

    const loadData = async () => {
      try {
        const [ordersRes, fluctuationRes, costRes, movesRes, catalogRes] = await Promise.all([
          fetchMonthlyOrders().catch(() => ({ data: [] })),
          fetchPriceFluctuation().catch(() => ({ data: [] })),
          fetchWeeklyCost().catch(() => ({ data: [] })),
          fetchInventoryMovements().catch(() => ({ data: [] })),
          fetchCatalog().catch(() => ({ data: {} }))
        ]);
        
        const catData = catalogRes.data || {};
        const pMap = {};
        const aMap = {};
        Object.entries(catData).forEach(([sheetName, sheetItems]) => {
           sheetItems.slice(1).forEach(row => {
               if (row[0]) {
                 const idStr = String(row[0]).trim();
                 pMap[idStr] = parseFloat(String(row[8] || '').replace(/[^\d.-]/g, '')) || 0;
                 aMap[idStr] = { catalog: sheetName, physArea: (row[6] || 'Sin Área').trim() };
               }
           });
        });
        setCatalogMap(pMap);
        setAreaMap(aMap);

        // Data format para Recharts, asumiendo campos desde GSheets
        const chartData = (fluctuationRes.data || []).map(item => ({
          name: item.Fecha ? new Date(item.Fecha).toLocaleDateString() : 'Sin Fecha',
          rawDate: item.Fecha ? new Date(item.Fecha) : null,
          precioNuevo: parseFloat(item.Nuevo_Precio || item.Precio_Nuevo || 0),
          precioAnt: parseFloat(item.Precio_Anterior || 0),
          producto: item.Producto || 'Desconocido',
          proveedor: item.Proveedor || '-',
          idProd: item.Id_Producto || item.ID_Producto || ''
        }));

        setOrdersData(ordersRes.data || []);
        setFluctuationData(chartData);
        setCostData(costRes.data || []);
        setMovementsData(movesRes.data || []);
      } catch (err) {
        console.error('Error cargando analítica:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [navigate]);

  const baseFilteredReceptions = costData.filter(item => {
    if (!(item.ID_Pedido || '').startsWith(filterType)) return false;
    
    if (filterMonth !== 'ALL' || filterYear !== 'ALL') {
      if (!item.Fecha) return false;
      const d = new Date(item.Fecha);
      if (filterMonth !== 'ALL' && (d.getMonth() + 1) !== parseInt(filterMonth)) return false;
      if (filterYear !== 'ALL' && d.getFullYear() !== parseInt(filterYear)) return false;
    }
    return true;
  });

  const availableOrderIds = [...new Set(baseFilteredReceptions.map(r => r.ID_Pedido))].sort((a,b) => b.localeCompare(a));

  const filteredReceptions = baseFilteredReceptions.filter(item => {
    if (filterOrderId !== 'ALL' && item.ID_Pedido !== filterOrderId) return false;
    return true;
  });

  const filteredFluctuation = fluctuationData.filter(item => {
    if (filterMonth !== 'ALL' || filterYear !== 'ALL') {
      if (!item.rawDate) return false;
      if (filterMonth !== 'ALL' && (item.rawDate.getMonth() + 1) !== parseInt(filterMonth)) return false;
      if (filterYear !== 'ALL' && item.rawDate.getFullYear() !== parseInt(filterYear)) return false;
    }
    return true;
  });

  const monthlyValuesMap = {};
  movementsData.forEach(m => {
    if (m.Fecha) {
       try {
          const date = new Date(m.Fecha);
          if (!isNaN(date.getTime())) {
            const mKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            if (!monthlyValuesMap[mKey]) monthlyValuesMap[mKey] = {};
            monthlyValuesMap[mKey][m.ID_Producto] = parseFloat(String(m['Valor del Inventario'] || '0').replace(/[^\d.-]/g, '')) || 0;
          }
       } catch(e) {}
    }
  });

  const monthlyInventoryData = Object.keys(monthlyValuesMap).sort().map(key => {
     const sum = Object.values(monthlyValuesMap[key]).reduce((acc, val) => acc + val, 0);
     const [year, month] = key.split('-');
     const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
     return {
        name: `${monthNames[parseInt(month, 10)-1]} ${year}`,
        valor: sum
     };
  });

  const uniqueReceivedOrders = new Set(filteredReceptions.map(r => r.ID_Pedido)).size;
  const receivedUnits = filteredReceptions.reduce((acc, item) => acc + (parseFloat(item.Recibido) || 0), 0);
  const totalCost = filteredReceptions.reduce((acc, item) => {
     const qty = parseFloat(item.Recibido) || 0;
     const price = catalogMap[item.ID_Producto] || 0;
     return acc + (qty * price);
  }, 0);

  // Cálculos para el Reporte de Valor de Inventario por Área
  const latestProductValues = {};
  movementsData.forEach(m => {
    if (filterOrderId !== 'ALL' && m.ID_Pedido !== filterOrderId) return;
    
    if (filterOrderId === 'ALL') {
       if (filterMonth !== 'ALL' || filterYear !== 'ALL') {
         if (!m.Fecha) return;
         const d = new Date(m.Fecha);
         if (filterMonth !== 'ALL' && (d.getMonth() + 1) !== parseInt(filterMonth)) return;
         if (filterYear !== 'ALL' && d.getFullYear() !== parseInt(filterYear)) return;
       }
    }
    const val = parseFloat(String(m['Valor del Inventario'] || '0').replace(/[^\d.-]/g, '')) || 0;
    const prodId = String(m.ID_Producto || '').trim();
    latestProductValues[prodId] = { val, fallbackArea: m['Área'] || m.Area || 'Sin Área' };
  });

  const valorizacion = {};
  let totalValGlobal = 0;

  Object.entries(latestProductValues).forEach(([prodId, data]) => {
     if (data.val === 0) return;
     const info = areaMap[prodId] || { catalog: 'Históricos / Otros', physArea: data.fallbackArea };
     if (!valorizacion[info.catalog]) valorizacion[info.catalog] = { total: 0, areas: {} };
     
     valorizacion[info.catalog].total += data.val;
     if (!valorizacion[info.catalog].areas[info.physArea]) {
       valorizacion[info.catalog].areas[info.physArea] = 0;
     }
     valorizacion[info.catalog].areas[info.physArea] += data.val;
     totalValGlobal += data.val;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100%' }}>
      {/* Navbar */}
      <nav className="glass-panel" style={{ borderRadius: 0, borderTop: 0, borderLeft: 0, borderRight: 0, padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <TrendingUp color="var(--primary)" />
          <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Reportes y Analítica</h2>
        </div>
        <button className="btn-primary" style={{ width: 'auto' }} onClick={() => navigate('/dashboard')}>
           Volver al Dashboard
        </button>
      </nav>

      {/* Main Content */}
      <main style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
        {loading ? (
          <div style={{ textAlign: 'center', marginTop: '3rem', color: 'var(--text-muted)' }}>Analizando datos de inventario...</div>
        ) : (
          <>
            <div className="glass-panel" style={{ padding: '1rem 2rem', marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button 
                   className={filterType === 'Sem' ? 'btn-primary' : 'btn-secondary'} 
                   style={{ width: 'auto', padding: '0.5rem 1rem', background: filterType === 'Sem' ? 'var(--primary)' : 'var(--bg-dark)' }} 
                   onClick={() => { setFilterType('Sem'); setFilterOrderId('ALL'); }}>
                  Semanales
                </button>
                <button 
                   className={filterType === 'Ext' ? 'btn-primary' : 'btn-secondary'} 
                   style={{ width: 'auto', padding: '0.5rem 1rem', background: filterType === 'Ext' ? 'var(--danger)' : 'var(--bg-dark)' }} 
                   onClick={() => { setFilterType('Ext'); setFilterOrderId('ALL'); }}>
                  Extras
                </button>
                <button 
                   className={filterType === 'SR' ? 'btn-primary' : 'btn-secondary'} 
                   style={{ width: 'auto', padding: '0.5rem 1rem', background: filterType === 'SR' ? 'var(--accent)' : 'var(--bg-dark)', color: filterType === 'SR' ? '#000' : 'white' }} 
                   onClick={() => { setFilterType('SR'); setFilterOrderId('ALL'); }}>
                  Especiales (SR)
                </button>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginLeft: 'auto', flexWrap: 'wrap' }}>
                <select className="input-field" style={{ width: 'auto', margin: 0, padding: '0.5rem', background: 'var(--bg-dark)' }} value={filterMonth} onChange={(e) => { setFilterMonth(e.target.value); setFilterOrderId('ALL'); }}>
                  <option value="ALL">Todo el Año</option>
                  <option value={1}>Enero</option>
                  <option value={2}>Febrero</option>
                  <option value={3}>Marzo</option>
                  <option value={4}>Abril</option>
                  <option value={5}>Mayo</option>
                  <option value={6}>Junio</option>
                  <option value={7}>Julio</option>
                  <option value={8}>Agosto</option>
                  <option value={9}>Septiembre</option>
                  <option value={10}>Octubre</option>
                  <option value={11}>Noviembre</option>
                  <option value={12}>Diciembre</option>
                </select>
                
                <select className="input-field" style={{ width: 'auto', margin: 0, padding: '0.5rem', background: 'var(--bg-dark)' }} value={filterYear} onChange={(e) => { setFilterYear(e.target.value); setFilterOrderId('ALL'); }}>
                  <option value="ALL">Todos los Años</option>
                  <option value={2026}>2026</option>
                  <option value={2025}>2025</option>
                  <option value={2024}>2024</option>
                </select>
                
                <select className="input-field" style={{ width: 'auto', minWidth: '180px', margin: 0, padding: '0.5rem', border: '1px solid var(--accent)', background: 'var(--bg-dark)' }} value={filterOrderId} onChange={(e) => setFilterOrderId(e.target.value)}>
                  <option value="ALL">-- Todos los Pedidos --</option>
                  {availableOrderIds.map(id => <option key={id} value={id}>{id}</option>)}
                </select>
              </div>
            </div>

            <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
            
            {/* Tarjetas Informativas */}
            <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Calendar size={48} color="var(--primary)" style={{ marginBottom: '1rem' }} />
              <h3 style={{ margin: '0 0 0.5rem 0' }}>Órdenes Recibidas</h3>
              <p style={{ color: 'var(--text-main)', fontSize: '2rem', fontWeight: 'bold', margin: 0 }}>{uniqueReceivedOrders}</p>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>En periodo seleccionado</span>
            </div>

            <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Activity size={48} color="var(--accent)" style={{ marginBottom: '1rem' }} />
              <h3 style={{ margin: '0 0 0.5rem 0', textAlign: 'center' }}>Unidades Físicas Recibidas</h3>
              <p style={{ color: 'var(--text-main)', fontSize: '2rem', fontWeight: 'bold', margin: 0 }}>
                 {receivedUnits} u
              </p>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>En periodo seleccionado</span>
            </div>

            <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <DollarSign size={48} color="var(--danger)" style={{ marginBottom: '1rem' }} />
              <h3 style={{ margin: '0 0 0.5rem 0' }}>Costo Representado</h3>
              <p style={{ color: 'var(--text-main)', fontSize: '2rem', fontWeight: 'bold', margin: 0 }}>
                 ${totalCost.toFixed(2)} USD
              </p>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>A precios vigentes de catálogo</span>
            </div>

            {/* Tabla de Bitácora de Precios */}
            <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gridColumn: '1 / -1' }}>
              <Activity size={32} color="var(--primary)" style={{ marginBottom: '1rem' }} />
              <h3 style={{ margin: '0 0 1.5rem 0', alignSelf: 'flex-start' }}>Historial de Fluctuación de Precios</h3>
              
              <div style={{ width: '100%', height: 350 }}>
                {filteredFluctuation.length > 0 ? (
                  <div style={{ overflowX: 'auto', width: '100%', maxHeight: '350px' }}>
                    <table className="inventory-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg-card)' }}>
                        <tr>
                          <th style={{ padding: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>Fecha</th>
                          <th style={{ padding: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>Proveedor</th>
                          <th style={{ padding: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>Área</th>
                          <th style={{ padding: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>Producto</th>
                          <th style={{ padding: '0.75rem', borderBottom: '1px solid var(--border-color)', textAlign: 'right' }}>Ant.</th>
                          <th style={{ padding: '0.75rem', borderBottom: '1px solid var(--border-color)', textAlign: 'right' }}>Actual</th>
                          <th style={{ padding: '0.75rem', borderBottom: '1px solid var(--border-color)', textAlign: 'right' }}>Var %</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredFluctuation.sort((a,b) => b.rawDate - a.rawDate).map((item, idx) => {
                          const delta = item.precioNuevo - item.precioAnt;
                          const pct = item.precioAnt > 0 ? (delta / item.precioAnt) * 100 : 0;
                          const fontColor = pct > 0 ? 'var(--danger)' : pct < 0 ? '#4ade80' : 'var(--text-muted)';
                          return (
                            <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                              <td style={{ padding: '0.75rem', fontSize: '0.9rem' }}>{item.name}</td>
                              <td style={{ padding: '0.75rem', fontSize: '0.9rem' }}>{item.proveedor}</td>
                              <td style={{ padding: '0.75rem', fontSize: '0.9rem', color: 'var(--primary)' }}>{areaMap[item.idProd] ? areaMap[item.idProd].physArea : '-'}</td>
                              <td style={{ padding: '0.75rem', fontSize: '0.9rem', fontWeight: 'bold' }}>{item.producto}</td>
                              <td style={{ padding: '0.75rem', fontSize: '0.9rem', textAlign: 'right', color: 'var(--text-muted)' }}>${item.precioAnt.toFixed(2)}</td>
                              <td style={{ padding: '0.75rem', fontSize: '0.9rem', textAlign: 'right', fontWeight: 'bold' }}>${item.precioNuevo.toFixed(2)}</td>
                              <td style={{ padding: '0.75rem', fontSize: '0.9rem', textAlign: 'right', fontWeight: 'bold', color: fontColor }}>
                                {pct > 0 ? '+' : ''}{pct.toFixed(2)}%
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                    No hay cambios de precios registrados en la bitácora todavía.
                  </div>
                )}
              </div>
            </div>

            {/* Grafico de Valor Cierre de Mes */}
            <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gridColumn: '1 / -1' }}>
              <DollarSign size={32} color="#94a3b8" style={{ marginBottom: '1rem' }} />
              <h3 style={{ margin: '0 0 1.5rem 0', alignSelf: 'flex-start', color: '#cbd5e1' }}>Valor del Inventario (Cierre de Mes)</h3>
              
              <div style={{ width: '100%', height: 350 }}>
                {monthlyInventoryData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyInventoryData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="name" stroke="var(--text-muted)" />
                      <YAxis stroke="var(--text-muted)" />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', color: '#fff' }} 
                        itemStyle={{ color: '#94a3b8' }}
                        formatter={(value) => [`$${value.toFixed(2)} USD`, 'Valor Total']}
                      />
                      <Bar dataKey="valor" fill="#475569" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                    No hay cierres de inventario procesados.
                  </div>
                )}
              </div>
            </div>

            {/* Nuevo: Reporte de Valorización por Área Física */}
            <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gridColumn: '1 / -1', background: 'rgba(15, 23, 42, 0.4)', borderTop: '2px solid var(--primary)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                <Activity size={32} color="#4ade80" />
                <div>
                  <h3 style={{ margin: 0, color: '#4ade80' }}>Reporte de Valor en Stock (Mínimo Anaquel + Recibido)</h3>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Desglose por Catálogo y Área Física. Filtrado actual: {filterOrderId !== 'ALL' ? filterOrderId : 'Histórico Consolidado'}</span>
                </div>
                <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                  <span style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Valor Total Estimado</span>
                  <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--accent)' }}>${totalValGlobal.toFixed(2)}</span>
                </div>
              </div>

              {Object.keys(valorizacion).length === 0 ? (
                 <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No hay suficientes datos de movimientos para estructurar el reporte de áreas.</div>
              ) : (
                 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                    {Object.entries(valorizacion).sort((a,b) => b[1].total - a[1].total).map(([catName, catData]) => (
                      <div key={catName} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '1.5rem', borderLeft: '4px solid #4ade80' }}>
                         <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>
                            <span style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#4ade80', textTransform: 'uppercase' }}>{catName}</span>
                            <span style={{ fontWeight: 'bold', color: 'white' }}>${catData.total.toFixed(2)}</span>
                         </div>
                         <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                            {Object.entries(catData.areas).sort((a,b) => b[1] - a[1]).map(([physArea, val]) => (
                              <div key={physArea} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                 <span style={{ color: '#fbbf24', fontSize: '0.95rem' }}>• {physArea}</span>
                                 <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>${val.toFixed(2)}</span>
                              </div>
                            ))}
                         </div>
                      </div>
                    ))}
                 </div>
              )}
            </div>
          </div>
          </>
        )}
      </main>
    </div>
  );
};

export default Analytics;
