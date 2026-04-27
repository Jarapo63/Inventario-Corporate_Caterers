import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, LayoutDashboard, Package, ClipboardList, TrendingUp, Users } from 'lucide-react';
import { fetchCatalog, fetchReceptionAlerts, resolveReceptionAlert, cancelReceptionAlert } from '../utils/api';
import { toast } from 'react-hot-toast';
import { confirmAction } from '../utils/toastHelpers';

const Dashboard = ({ setAuth }) => {
  const navigate = useNavigate();
  const [userName, setUserName] = useState('');
  const [userRole, setUserRole] = useState('');
  const [catalog, setCatalog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState([]);
  const [resolvingIds, setResolvingIds] = useState({});
  const [resolutionQty, setResolutionQty] = useState({});

  useEffect(() => {
    setUserName(localStorage.getItem('userName') || 'Usuario');
    const rawRole = (localStorage.getItem('userRole') || 'Staff').trim();
    const formattedRole = rawRole.charAt(0).toUpperCase() + rawRole.slice(1).toLowerCase();
    setUserRole(formattedRole);

    // Cargar inventario inicial
    fetchCatalog().then(data => {
      setCatalog(data.data);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });

    // Cargar Alertas de Recepción
    fetchReceptionAlerts().then(data => {
      setAlerts(data);
    }).catch(err => {
      console.error('No se pudieron cargar las alertas:', err);
    });
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userName');
    setAuth(false);
  };

  const loadAlerts = () => {
    fetchReceptionAlerts().then(data => {
      setAlerts(data);
    }).catch(err => console.error('No se pudieron cargar las alertas:', err));
  };

  const handleResolveAlert = async (orderId, productId) => {
    const qty = parseFloat(resolutionQty[`${orderId}-${productId}`]);
    if (!qty || qty <= 0) {
      toast.error("Por favor ingresa una cantidad válida mayor a 0.");
      return;
    }
    
    setResolvingIds(prev => ({ ...prev, [`${orderId}-${productId}`]: true }));
    try {
      await resolveReceptionAlert(orderId, productId, qty);
      toast.success('Se resolvió la discrepancia y el ingreso físico se registró en Movimientos de Inventario.');
      setResolutionQty(prev => ({ ...prev, [`${orderId}-${productId}`]: '' }));
      loadAlerts(); // Recargar alertas (puede que desaparezca)
    } catch (err) {
      toast.error(`Error al resolver: ${err.message}`);
    } finally {
      setResolvingIds(prev => ({ ...prev, [`${orderId}-${productId}`]: false }));
    }
  };

  const handleCancelAlert = (orderId, productId) => {
    confirmAction('¿Confirmas que deseas cancelar esta mercancía definitivamente? Se moverá al reporte de faltantes.', async () => {
      setResolvingIds(prev => ({ ...prev, [`${orderId}-${productId}`]: true }));
      try {
        await cancelReceptionAlert(orderId, productId);
        toast.success('La mercancía se ha marcado como Cancelada/Faltante.');
        loadAlerts();
      } catch (err) {
        toast.error(`Error al cancelar: ${err.message}`);
      } finally {
        setResolvingIds(prev => ({ ...prev, [`${orderId}-${productId}`]: false }));
      }
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100%' }}>
      {/* Top Navbar */}
      <nav className="glass-panel" style={{ borderRadius: 0, borderTop: 0, borderLeft: 0, borderRight: 0, padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <LayoutDashboard color="var(--primary)" />
          <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Dashboard</h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ textAlign: 'right' }}>
            <span style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600 }}>{userName}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Rol: {userRole}</span>
          </div>
          <button onClick={handleLogout} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.5rem' }}>
            <LogOut size={20} />
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
        <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
          
          {/* Módulo de Inventario Activo (Admin / Manager) */}
          {(userRole === 'Admin' || userRole === 'Manager') && (
            <div 
              className="glass-panel" 
              style={{ padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', transition: 'transform 0.2s' }}
              onClick={() => navigate('/capture')}
              onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
              onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              <ClipboardList size={48} color="var(--primary)" style={{ marginBottom: '1rem' }} />
              <h3 style={{ margin: '0 0 0.5rem 0' }}>Realizar Ciclo Semanal</h3>
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', margin: 0, fontSize: '0.875rem' }}>Captura de "En Stock" en área de almacenamiento.</p>
            </div>
          )}

          {/* Módulo Recepción (Admin / Manager / Subcheff / Asistente) */}
          {(userRole === 'Admin' || userRole === 'Manager' || userRole === 'Subcheff' || userRole === 'Asistente') && (
            <div 
              className="glass-panel" 
              style={{ padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', transition: 'transform 0.2s' }}
              onClick={() => navigate('/reception')}
              onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
              onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              <Package size={48} color="var(--accent)" style={{ marginBottom: '1rem' }} />
              <h3 style={{ margin: '0 0 0.5rem 0', textAlign: 'center' }}>Recepción de Pedidos</h3>
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', margin: 0, fontSize: '0.875rem' }}>Contrastar e ingresar físicamente la mercancía del proveedor.</p>
            </div>
          )}

          {/* Gestión de Catálogo (Admin / Asistente) */}
          {(userRole === 'Admin' || userRole === 'Asistente') && (
            <div 
              className="glass-panel" 
              style={{ padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', transition: 'transform 0.2s' }}
              onClick={() => navigate('/manage')}
              onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
              onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              <Package size={48} color="var(--accent)" style={{ marginBottom: '1rem' }} />
              <h3 style={{ margin: '0 0 0.5rem 0' }}>Gestión de Catálogo</h3>
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', margin: 0, fontSize: '0.875rem' }}>Añadir productos, cambiar precios o inhabilitar ítems.</p>
            </div>
          )}

          {/* Gestión de Proveedores (Admin / Asistente) */}
          {(userRole === 'Admin' || userRole === 'Asistente') && (
            <div 
              className="glass-panel" 
              style={{ padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', transition: 'transform 0.2s' }}
              onClick={() => navigate('/providers')}
              onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
              onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              <Users size={48} color="var(--primary)" style={{ marginBottom: '1rem' }} />
              <h3 style={{ margin: '0 0 0.5rem 0', textAlign: 'center' }}>Directorio de Proveedores</h3>
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', margin: 0, fontSize: '0.875rem' }}>Administrar contactos, altas y bajas de proveedores.</p>
            </div>
          )}

          {/* Administración de Usuarios (Solo Admin) */}
          {userRole === 'Admin' && (
            <div 
              className="glass-panel" 
              style={{ padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', transition: 'transform 0.2s' }}
              onClick={() => navigate('/users')}
              onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
              onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              <Users size={48} color="var(--danger)" style={{ marginBottom: '1rem' }} />
              <h3 style={{ margin: '0 0 0.5rem 0', textAlign: 'center' }}>Administrar Empleados</h3>
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', margin: 0, fontSize: '0.875rem' }}>Control de acceso, contraseñas y asignación de jerarquías.</p>
            </div>
          )}

        </div>

        {/* Analitica y Reportes (Solo Admin) */}
        {userRole === 'Admin' && (
          <>
          <div 
            className="glass-panel animate-fade-in" 
            style={{ 
              marginTop: '1.5rem', 
              padding: '2rem', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              cursor: 'pointer', 
              background: 'linear-gradient(45deg, rgba(8, 145, 178, 0.2), rgba(30, 41, 59, 0.8))',
              transition: 'transform 0.2s',
              border: '1px solid var(--accent)'
            }}
            onClick={() => navigate('/reports/orders')}
            onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <div>
              <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ClipboardList size={24} color="var(--accent)" />
                Registro y Reporte de Pedidos
              </h3>
              <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.875rem' }}>Vista consolidada del histórico de las órdenes Semanales y Extraordinarias.</p>
            </div>
          </div>
          
          <div 
            className="glass-panel animate-fade-in" 
            style={{ 
              marginTop: '1rem', 
              padding: '2rem', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              cursor: 'pointer', 
              background: 'linear-gradient(45deg, rgba(239, 68, 68, 0.15), rgba(30, 41, 59, 0.8))',
              transition: 'transform 0.2s',
              border: '1px solid #ef4444'
            }}
            onClick={() => navigate('/reports/cancelled')}
            onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <div>
              <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Package size={24} color="#ef4444" />
                Reporte de Faltantes/Cancelados
              </h3>
              <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.875rem' }}>Visualiza los pedidos marcados como incompletos y prepara órdenes extraordinarias.</p>
            </div>
          </div>

          <div 
            className="glass-panel animate-fade-in" 
            style={{ 
              marginTop: '1rem', 
              padding: '2rem', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              cursor: 'pointer', 
              background: 'linear-gradient(45deg, rgba(59, 130, 246, 0.2), rgba(30, 41, 59, 0.8))',
              transition: 'transform 0.2s',
              border: '1px solid var(--primary)'
            }}
            onClick={() => navigate('/analytics')}
            onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <div>
              <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <TrendingUp size={24} color="var(--primary)" />
                Analítica y Reportes Financieros
              </h3>
              <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.875rem' }}>Visualiza las métricas clave de tus movimientos, fluctuaciones de precios y costo semanal calculado.</p>
            </div>
          </div>

          <div 
            className="glass-panel animate-fade-in" 
            style={{ 
              marginTop: '1rem', 
              padding: '2rem', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              cursor: 'pointer', 
              background: 'linear-gradient(45deg, rgba(16, 185, 129, 0.15), rgba(30, 41, 59, 0.8))',
              transition: 'transform 0.2s',
              border: '1px solid #10b981'
            }}
            onClick={() => navigate('/reconciliation')}
            onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <div>
              <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ClipboardList size={24} color="#10b981" />
                Conciliación Contable (Proveedores)
              </h3>
              <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.875rem' }}>Valida y exporta los montos a pagar por proveedor basándose en las recepciones reales del mes.</p>
            </div>
          </div>
        </>
        )}

        <div style={{ marginTop: '2rem', display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '300px' }}>
            {loading ? (
               <p style={{ color: 'var(--text-muted)' }}>Cargando catálogo desde Google Sheets...</p>
            ) : (
              <div className="glass-panel" style={{ padding: '1rem' }}>
                <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--accent)' }}>Conexión en vivo: {catalog ? Object.keys(catalog).length : 0} hojas catalogadas listas para escaneo.</p>
              </div>
            )}
          </div>
          
          {(userRole === 'Admin' || userRole === 'Manager' || userRole === 'Subcheff' || userRole === 'Asistente') && alerts.length > 0 && (
            <div className="glass-panel" style={{ flex: 1, minWidth: '300px', border: '1px solid #ef4444', background: 'rgba(239, 68, 68, 0.05)' }}>
              <div style={{ padding: '1rem', borderBottom: '1px solid rgba(239, 68, 68, 0.2)' }}>
                <h4 style={{ margin: 0, color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Package size={20} /> Mercancía Por Revisar / Faltante
                </h4>
              </div>
              <div style={{ maxHeight: '200px', overflowY: 'auto', padding: '1rem' }}>
                {alerts.map((a, idx) => (
                  <div key={idx} style={{ marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600 }}>{a.productName}</span>
                      <span style={{ color: '#ef4444', fontWeight: 'bold' }}>Faltan {a.ordered - a.received} pzs</span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem', marginBottom: '0.5rem' }}>
                      Pedido: {a.orderId} | ID: {a.productId} | Pedido: {a.ordered} | Recibido: {a.received}
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <input 
                        type="number" 
                        min="0"
                        step="1"
                        placeholder="Q. Llegada"
                        className="input-field"
                        style={{ margin: 0, padding: '0.3rem', fontSize: '0.8rem', width: '90px' }}
                        value={resolutionQty[`${a.orderId}-${a.productId}`] || ''}
                        onChange={e => setResolutionQty(p => ({ ...p, [`${a.orderId}-${a.productId}`]: e.target.value }))}
                      />
                      <button 
                        className="btn-primary" 
                        style={{ padding: '0.3rem 0.5rem', fontSize: '0.8rem', flex: 1 }}
                        onClick={() => handleResolveAlert(a.orderId, a.productId)}
                        disabled={resolvingIds[`${a.orderId}-${a.productId}`]}
                      >
                        {resolvingIds[`${a.orderId}-${a.productId}`] ? 'Resolviendo...' : 'Recibir y Resolver'}
                      </button>
                      <button 
                        className="btn-primary" 
                        style={{ padding: '0.3rem 0.5rem', fontSize: '0.8rem', flex: 1, backgroundColor: '#ef4444', borderColor: '#ef4444' }}
                        onClick={() => handleCancelAlert(a.orderId, a.productId)}
                        disabled={resolvingIds[`${a.orderId}-${a.productId}`]}
                      >
                        Cancelar Faltante
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
