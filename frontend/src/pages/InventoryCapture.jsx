import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Loader2, AlertCircle, Search } from 'lucide-react';
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
  const [searchTerm, setSearchTerm] = useState('');
  const [userRole, setUserRole] = useState('');

  const initializeNewSession = () => {
    const orderId = `PED-${Math.floor(Date.now() / 1000)}`;
    setCaptureSessionId(orderId);
    setCaptureDate(new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }));
  };

  useEffect(() => {
    const user = localStorage.getItem('userName') || 'default';
    const savedCart = localStorage.getItem(`inventoryCart_${user}`);
    
    if (savedCart) {
      try {
        const parsed = JSON.parse(savedCart);
        if (parsed.requisitions && Object.keys(parsed.requisitions).length > 0) {
           setCaptureSessionId(parsed.sessionId);
           setCaptureDate(parsed.captureDate);
           setCaptureType(parsed.captureType || 'SEMANAL');
           setRequisitions(parsed.requisitions);
           // Notificamos al usuario que recuperamos su sesión
           toast.success("Borrador recuperado. Puedes continuar tu captura.", { duration: 3000, icon: '🛒' });
        } else {
           initializeNewSession();
        }
      } catch (e) {
        console.error("Error parsing cart data", e);
        initializeNewSession();
      }
    } else {
      initializeNewSession();
    }
    
    setUserRole(localStorage.getItem('userRole') || '');
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
    setRequisitions(prev => {
      const newReqs = {
        ...prev,
        [captureType]: { ...prev[captureType], [`${sheet}-${index}`]: value }
      };
      
      // Autoguardado síncrono ultra-seguro
      if (captureSessionId) {
        const user = localStorage.getItem('userName') || 'default';
        const cartData = {
          sessionId: captureSessionId,
          captureDate: captureDate,
          captureType: captureType,
          requisitions: newReqs
        };
        localStorage.setItem(`inventoryCart_${user}`, JSON.stringify(cartData));
      }
      
      return newReqs;
    });
  };

  const handleCaptureTypeChange = (type) => {
    setCaptureType(type);
    if (captureSessionId) {
      const user = localStorage.getItem('userName') || 'default';
      const cartData = {
        sessionId: captureSessionId,
        captureDate: captureDate,
        captureType: type,
        requisitions: requisitions
      };
      localStorage.setItem(`inventoryCart_${user}`, JSON.stringify(cartData));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    
    const activeData = requisitions[captureType];

    const inventoryData = Object.entries(activeData).map(([key, reqStr]) => {
      const [sheet, idx] = key.split('-');
      const row = catalog[sheet][parseInt(idx)];

      let faltante = Math.ceil(parseFloat(String(reqStr).replace(/,/g, '')) || 0); // Requerimiento es 100% manual e independiente

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
      
      // Limpiar el carrito de la memoria local
      const user = localStorage.getItem('userName') || 'default';
      localStorage.removeItem(`inventoryCart_${user}`);

      initializeNewSession();
      setRequisitions({ SEMANAL: {}, EXTRAORDINARIO: {} });
      
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
            onClick={() => handleCaptureTypeChange('SEMANAL')} 
            style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', border: 'none', background: captureType === 'SEMANAL' ? 'var(--primary)' : 'transparent', color: captureType === 'SEMANAL' ? 'white' : 'var(--text-muted)', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
          >
            Semanal
          </button>
          <button 
            onClick={() => handleCaptureTypeChange('EXTRAORDINARIO')} 
            style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', border: 'none', background: captureType === 'EXTRAORDINARIO' ? 'var(--danger)' : 'transparent', color: captureType === 'EXTRAORDINARIO' ? 'white' : 'var(--text-muted)', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
          >
            <AlertCircle size={16} />
            Extraordinario
          </button>
        </div>
        
        {/* Buscador de Productos */}
        <div style={{ marginTop: '1rem', position: 'relative' }}>
          <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={20} />
          <input 
            type="text" 
            placeholder="Buscar producto por nombre o ID..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field"
            style={{ paddingLeft: '3rem', marginTop: 0 }}
          />
        </div>
      </div>

      {/* Lista de Captura */}
      <main style={{ flex: 1, padding: '1rem', overflowY: 'auto' }}>
        {Object.keys(catalog).length === 0 && (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No se encontraron productos en el catálogo.</p>
        )}

        {Object.keys(catalog).filter(sheetName => {
          if (sheetName === 'Holiday') return true;
          if (userRole === 'Manager_Drivers' && sheetName !== 'Drivers List') return false;
          if (userRole === 'Manager_Kitchen' && sheetName !== 'Kitchen List') return false;
          return true;
        }).map(sheetName => {
          const rows = catalog[sheetName];
          if (!rows || rows.length <= 1) return null;
          
          // Agrupar los ítems activos por su Área Física, conservando el orden de aparición original
          const areaOrder = [];
          const groupedByArea = {};
          
          rows.slice(1).forEach((row, idx) => {
             const actualIdx = idx + 1;
             const isInactive = (row[10] || '').trim().toLowerCase() === 'inactivo';
             if (isInactive) return; 

             if (searchTerm.trim()) {
               const searchLower = searchTerm.toLowerCase();
               const productName = (row[2] || '').toLowerCase();
               const productId = (row[0] || '').toLowerCase();
               if (!productName.includes(searchLower) && !productId.includes(searchLower)) {
                 return;
               }
             }

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
                              type="text" 
                              inputMode="numeric"
                              placeholder={captureType === 'SEMANAL' ? "A Pedir" : "Cant."}
                              className="input-field" 
                              style={{ marginTop: 0, textAlign: 'center', padding: '0.5rem', fontSize: '0.95rem', width: '120px', background: captureType === 'EXTRAORDINARIO' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(56, 189, 248, 0.1)' }}
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
