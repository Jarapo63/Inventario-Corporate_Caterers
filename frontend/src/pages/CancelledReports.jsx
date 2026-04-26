import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, PackageX, CheckCircle, Printer, Trash2 } from 'lucide-react';
import { fetchCancelledAlerts, markCancelledAsOrdered, dropCancelledAlert } from '../utils/api';

const CancelledReports = () => {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  const loadAlerts = async () => {
    setLoading(true);
    try {
      const data = await fetchCancelledAlerts();
      setAlerts(data);
    } catch (error) {
      console.error('Error fetching cancelled alerts:', error);
      alert('Error cargando el reporte.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, []);

  const handleMarkOrdered = async (orderId, productId) => {
    setProcessingId(`${orderId}-${productId}-order`);
    try {
      await markCancelledAsOrdered(orderId, productId);
      loadAlerts();
    } catch (err) {
      alert(`Error al marcar como pedido: ${err.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  const printTicket = (alertData) => {
    const faltante = alertData.ordered - alertData.received;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
            <head>
                <title>Comprobante de Cancelación Definitiva</title>
                <style>
                    body { font-family: monospace; padding: 20px; }
                    .ticket { border: 1px dashed #000; padding: 20px; width: 350px; margin: 0 auto; text-align: center; }
                    h2 { margin-top: 0; }
                    .details { text-align: left; margin-top: 20px; }
                    .details p { margin: 5px 0; }
                </style>
            </head>
            <body>
                <div class="ticket">
                    <h2>CANCELACIÓN<br>DEFINITIVA</h2>
                    <p><strong>INVENTARIO CC</strong></p>
                    <hr/>
                    <div class="details">
                        <p><strong>Pedido Orig:</strong> ${alertData.orderId}</p>
                        <p><strong>Fecha Impr:</strong> ${new Date().toLocaleString()}</p>
                        <p><strong>Producto:</strong> ${alertData.productName}</p>
                        <p><strong>Pzs Devueltas/Canceladas:</strong> ${faltante}</p>
                    </div>
                    <hr/>
                    <p><small>Ampara ajuste financiero por no recepción y reembolso del proveedor.</small></p>
                    <br>
                    <p style="text-align:center;">Firma Admistrador</p>
                    <p>_______________________</p>
                </div>
                <script>
                    window.onload = function() {
                      window.print();
                    }
                </script>
            </body>
        </html>
    `);
    printWindow.document.close();
  };

  const handleDrop = async (alertData) => {
    if (!window.confirm("¿Estás seguro de cancelar definitivamente este recibo y generar el PDF comprobante? (No se volverá a pedir)")) return;
    
    setProcessingId(`${alertData.orderId}-${alertData.productId}-drop`);
    try {
      await dropCancelledAlert(alertData.orderId, alertData.productId);
      printTicket(alertData);
      loadAlerts();
    } catch (err) {
      alert(`Error al cancelar: ${err.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <button 
        onClick={() => navigate('/dashboard')}
        className="btn-secondary"
        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2rem', padding: '0.5rem 1rem', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-main)', cursor: 'pointer', borderRadius: '4px' }}
      >
        <ArrowLeft size={16} /> Volver al Dashboard
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <PackageX size={32} color="#ef4444" />
        <h1 style={{ margin: 0, color: '#ef4444' }}>Reporte de Mercancía Faltante / Cancelada</h1>
      </div>
      
      <p style={{ color: 'var(--text-muted)' }}>
        A continuación se listan los insumos que fueron marcados como faltantes o cancelados durante la recepción. 
        Utiliza este reporte para realizar las compras extraordinarias y márcalos como "Re-Pedido" una vez solicitados.
      </p>

      {loading ? (
        <p style={{ marginTop: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Cargando reporte de faltantes...</p>
      ) : alerts.length === 0 ? (
        <div className="glass-panel" style={{ padding: '3rem 2rem', textAlign: 'center', marginTop: '2rem' }}>
          <CheckCircle size={48} color="var(--primary)" style={{ marginBottom: '1rem', opacity: 0.5 }} />
          <h3 style={{ margin: 0, color: 'var(--text-main)' }}>Todo claro</h3>
          <p style={{ color: 'var(--text-muted)' }}>No hay mercancía cancelada pendiente de un nuevo pedido.</p>
        </div>
      ) : (
        <div className="glass-panel" style={{ marginTop: '2rem', background: 'rgba(30, 41, 59, 0.5)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', gap: '1rem', padding: '1rem', borderBottom: '1px solid var(--border-color)', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            <div>Producto</div>
            <div>ID Pedido</div>
            <div>Fecha</div>
            <div>Faltante</div>
            <div>Acción</div>
          </div>
          
          <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
            {alerts.map((a, idx) => {
              const faltante = a.ordered - a.received;
              const isProcessingOrder = processingId === `${a.orderId}-${a.productId}-order`;
              const isProcessingDrop = processingId === `${a.orderId}-${a.productId}-drop`;
              const anyProcessing = isProcessingOrder || isProcessingDrop;
              
              return (
                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', gap: '1rem', padding: '1rem', borderBottom: '1px solid var(--border-color)', alignItems: 'center' }}>
                  <div style={{ fontWeight: 500, color: 'var(--text-main)' }}>{a.productName}</div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{a.orderId}</div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{new Date(a.date).toLocaleDateString()}</div>
                  <div style={{ color: '#ef4444', fontWeight: 'bold' }}>{faltante} pzs</div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexDirection: 'column' }}>
                    <button 
                      className="btn-primary" 
                      onClick={() => handleMarkOrdered(a.orderId, a.productId)}
                      disabled={anyProcessing}
                      style={{ padding: '0.5rem', width: '100%', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}
                    >
                      {isProcessingOrder ? 'Procesando...' : 'Marcar Re-Pedido'}
                    </button>
                    <button 
                      onClick={() => handleDrop(a)}
                      disabled={anyProcessing}
                      style={{ padding: '0.4rem', width: '100%', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', background: 'transparent', color: '#ef4444', border: '1px solid #ef4444', borderRadius: '4px', cursor: anyProcessing ? 'not-allowed' : 'pointer' }}
                    >
                      {isProcessingDrop ? (
                        'Procesando...'
                      ) : (
                        <>
                          <Trash2 size={12} />
                          <Printer size={12} /> Cancelar / PDF
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default CancelledReports;
