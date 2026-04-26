import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Loader2, AlertCircle } from 'lucide-react';
import { fetchCatalog, getAuthHeaders, submitInventory } from '../utils/api';
import { toast } from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const InventoryCapture = () => {
  const navigate = useNavigate();
  const [catalog, setCatalog] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [captureType, setCaptureType] = useState('SEMANAL');
  const [captureSessionId, setCaptureSessionId] = useState('');
  const [captureDate, setCaptureDate] = useState('');
  const [requisitions, setRequisitions] = useState({
    SEMANAL: {},
    EXTRAORDINARIO: {}
  });

  useEffect(() => {
    const orderId = `PED-${Math.floor(Date.now() / 1000)}`;
    setCaptureSessionId(orderId);
    setCaptureDate(new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }));
    loadCatalog();
  }, []);

  const loadCatalog = async () => {
    try {
      const { data } = await fetchCatalog();
      setCatalog(data);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReqChange = (sheet, index, value) => {
    setRequisitions(prev => ({
      ...prev,
      [captureType]: { ...prev[captureType], [`${sheet}-${index}`]: value }
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    
    const activeData = requisitions[captureType];

    const inventoryData = Object.entries(activeData).map(([key, reqStr]) => {
      const [sheet, idx] = key.split('-');
      const row = catalog[sheet][parseInt(idx)];

      let faltante = Math.ceil(parseFloat(reqStr) || 0); // Requerimiento es 100% manual e independiente

      return {
        idProducto: row[0] || `Unknown-${idx}`,
        idProv: row[5] || '-',
        proveedor: row[1] || 'Sin Proveedor',
        nombreProducto: row[2] || 'Sin Nombre',
        area: sheet,
        rowNum: parseInt(idx, 10) + 1,
        stockFisico: parseFloat(row[7]) || 0,
        cantidadDentro: parseFloat(row[4]) || 1,
        requerimiento: faltante,
        orden: faltante,
        precioUnitario: parseFloat(String(row[8] || '0').replace(/[^0-9.-]+/g, '')) || 0
      };
    });

    try {
      const result = await submitInventory(inventoryData, captureType, captureSessionId);
      
      toast.success(result.message); 
      
      setCaptureSessionId(`PED-${Math.floor(Date.now() / 1000)}`);
      setCaptureDate(new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }));

      setRequisitions(prev => ({ ...prev, [captureType]: {} }));
      
      navigate('/dashboard');
    } catch (err) {
      toast.error('Error guardando: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container">
        <Loader2 className="animate-spin" color="var(--primary)" size={48} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100%' }}>
      {/* Header Navigation */}
      <nav className="glass-panel" style={{ borderRadius: 0, borderTop: 0, borderLeft: 0, borderRight: 0, padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 50 }}>
        <button onClick={() => navigate('/dashboard')} style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer', padding: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ArrowLeft size={20} />
          <span>Volver</span>
        </button>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '1.2rem', textAlign: 'center' }}>
            {captureType === 'SEMANAL' ? 'Ciclo de Inventario' : 'Req. Extraordinario'}
          </h2>
          <span style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 'bold', marginTop: '4px' }}>Pedido: {captureSessionId}</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{captureDate}</span>
        </div>
        <button 
          onClick={handleSave} 
          disabled={saving || Object.keys(requisitions[captureType]).length === 0} 
          style={{ background: 'var(--accent)', border: 'none', color: 'white', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: saving ? 0.7 : 1 }}
        >
          <Save size={18} />
          <span>{saving ? '...' : 'Guardar'}</span>
        </button>
      </nav>

      {/* Control de Tipo de Captura */}
      <div style={{ padding: '1rem 1rem 0 1rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(15, 23, 42, 0.5)', padding: '0.5rem', borderRadius: '12px' }}>
          <button 
            onClick={() => setCaptureType('SEMANAL')} 
            style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', border: 'none', background: captureType === 'SEMANAL' ? 'var(--primary)' : 'transparent', color: captureType === 'SEMANAL' ? 'white' : 'var(--text-muted)', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
          >
            Semanal
          </button>
          <button 
            onClick={() => setCaptureType('EXTRAORDINARIO')} 
            style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', border: 'none', background: captureType === 'EXTRAORDINARIO' ? 'var(--danger)' : 'transparent', color: captureType === 'EXTRAORDINARIO' ? 'white' : 'var(--text-muted)', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
          >
            <AlertCircle size={16} />
            Extraordinario
          </button>
        </div>
      </div>

      {/* Lista de Captura */}
      <main style={{ flex: 1, padding: '1rem', overflowY: 'auto' }}>
        {Object.keys(catalog).length === 0 && (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No se encontraron productos en el catálogo.</p>
        )}

        {Object.keys(catalog).map(sheetName => {
          const rows = catalog[sheetName];
          if (!rows || rows.length <= 1) return null;
          
          // Agrupar los ítems activos por su Área Física, conservando el orden de aparición original
          const areaOrder = [];
          const groupedByArea = {};
          
          rows.slice(1).forEach((row, idx) => {
             const actualIdx = idx + 1;
             const isInactive = (row[10] || '').trim().toLowerCase() === 'inactivo';
             if (isInactive) return; 

             const areaName = (row[6] || 'Sin Área').trim();
             if (!groupedByArea[areaName]) {
                 groupedByArea[areaName] = [];
                 areaOrder.push(areaName); // Guardamos el área en el orden exacto que aparece en el Excel
             }
             groupedByArea[areaName].push({ row, actualIdx });
          });

          if (areaOrder.length === 0) return null;

          return (
            <div key={sheetName} style={{ marginBottom: '3rem' }}>
              <h3 style={{ borderBottom: '2px solid #4ade80', paddingBottom: '0.6rem', color: '#4ade80', position: 'sticky', top: '-1rem', background: 'var(--bg-dark)', zIndex: 20, textTransform: 'uppercase', letterSpacing: '1px', boxShadow: '0 4px 6px -6px rgba(0,0,0,0.5)' }}>
                Catálogo: {sheetName}
              </h3>

              {areaOrder.map(areaName => {
                const areaItems = groupedByArea[areaName];
                return (
                  <div key={areaName} style={{ marginBottom: '2.5rem', paddingLeft: '0.5rem' }}>
                    <h4 style={{ color: '#fbbf24', borderLeft: '4px solid #fbbf24', paddingLeft: '0.5rem', marginBottom: '1rem', fontSize: '1.05rem', letterSpacing: '0.5px' }}>
                      Área: {areaName}
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {areaItems.map(({row, actualIdx}) => (
                        <div key={`${sheetName}-${actualIdx}`} className="glass-panel" style={{ padding: '1rem', display: 'flex', justifyContent: 'flex-start', alignItems: 'center', gap: '1.5rem', borderLeft: '3px solid rgba(251, 191, 36, 0.4)' }}>
                          <div style={{ flex: '0 1 auto', maxWidth: '75%' }}>
                            <span style={{ display: 'block', fontWeight: 600, fontSize: '1.1rem', lineHeight: '1.3' }}>{row[2] || 'Sin Nombre'}</span>
                            <span style={{ fontSize: '0.95rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.4rem' }}>
                              ID: {row[0]} | Id_Prod_Prov: {row[5] || '-'} | UOM: {row[3]} <br/>
                              <span style={{ color: 'var(--accent)', fontWeight: 600, fontSize: '1rem', display: 'inline-block', marginTop: '0.2rem' }}>Min Stock req: {row[7] || 'N/A'}</span>
                            </span>
                          </div>
                          <div style={{ flex: '0 0 100px', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginLeft: 'auto' }}>
                            <input 
                              type="number" 
                              min="0"
                              step="1"
                              placeholder={captureType === 'SEMANAL' ? "A Pedir" : "Cant."}
                              className="input-field" 
                              style={{ marginTop: 0, textAlign: 'center', padding: '0.5rem', fontSize: '0.95rem', width: '100px', background: captureType === 'EXTRAORDINARIO' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(56, 189, 248, 0.1)' }}
                              value={requisitions[captureType][`${sheetName}-${actualIdx}`] || ''}
                              onChange={(e) => handleReqChange(sheetName, actualIdx, e.target.value)}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </main>
    </div>
  );
};

export default InventoryCapture;
