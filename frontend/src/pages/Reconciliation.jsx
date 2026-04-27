import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, FileText, Loader2, DollarSign, Search } from 'lucide-react';
import { fetchProviderReconciliation } from '../utils/api';
import { toast } from 'react-hot-toast';
import Papa from 'papaparse';

const Reconciliation = () => {
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filtros de fecha (por defecto Mes y Año actual)
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState((currentDate.getMonth() + 1).toString().padStart(2, '0'));
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear().toString());

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const result = await fetchProviderReconciliation();
      setData(result.data || []);
    } catch (err) {
      toast.error(err.message || 'Error cargando datos de conciliación');
    } finally {
      setLoading(false);
    }
  };

  // Filtrado y Agrupación
  const { filteredData, grandTotal } = useMemo(() => {
    let total = 0;
    const filtered = data.filter(item => {
      if (!item.date) return false;
      const d = new Date(item.date);
      const month = (d.getMonth() + 1).toString().padStart(2, '0');
      const year = d.getFullYear().toString();
      return month === selectedMonth && year === selectedYear;
    });

    const grouped = {};
    filtered.forEach(item => {
      if (!grouped[item.provider]) {
        grouped[item.provider] = { provider: item.provider, items: [], subTotal: 0 };
      }
      grouped[item.provider].items.push(item);
      grouped[item.provider].subTotal += item.totalCost;
      total += item.totalCost;
    });

    // Ordenar items por fecha dentro de cada proveedor
    Object.values(grouped).forEach(group => {
      group.items.sort((a, b) => new Date(b.date) - new Date(a.date));
    });

    const groupedArray = Object.values(grouped).sort((a, b) => b.subTotal - a.subTotal);

    return { filteredData: groupedArray, grandTotal: total };
  }, [data, selectedMonth, selectedYear]);

  // Generar CSV
  const handleExportCSV = () => {
    if (filteredData.length === 0) {
      toast.error('No hay datos para exportar');
      return;
    }

    const csvData = [];
    
    // Encabezado del reporte
    csvData.push({
      Proveedor: `REPORTE DE CONCILIACIÓN - MES: ${selectedMonth} AÑO: ${selectedYear}`,
      'ID Pedido (Factura)': '',
      'Fecha Recepción': '',
      'Monto Total (USD)': ''
    });
    csvData.push({ Proveedor: '', 'ID Pedido (Factura)': '', 'Fecha Recepción': '', 'Monto Total (USD)': '' }); // Fila vacía

    filteredData.forEach(group => {
      group.items.forEach(item => {
        csvData.push({
          Proveedor: group.provider,
          'ID Pedido (Factura)': item.orderId,
          'Fecha Recepción': new Date(item.date).toLocaleDateString(),
          'Monto Total (USD)': item.totalCost.toFixed(2)
        });
      });
      // Añadir fila de subtotal
      csvData.push({
        Proveedor: `TOTAL ${group.provider}`,
        'ID Pedido (Factura)': '',
        'Fecha Recepción': '',
        'Monto Total (USD)': group.subTotal.toFixed(2)
      });
    });

    // Gran Total
    csvData.push({ Proveedor: '', 'ID Pedido (Factura)': '', 'Fecha Recepción': 'GRAN TOTAL', 'Monto Total (USD)': grandTotal.toFixed(2) });

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `Conciliacion_${selectedMonth}_${selectedYear}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const years = Array.from({length: 5}, (_, i) => currentDate.getFullYear() - i);
  const months = [
    { value: '01', label: 'Enero' }, { value: '02', label: 'Febrero' }, { value: '03', label: 'Marzo' },
    { value: '04', label: 'Abril' }, { value: '05', label: 'Mayo' }, { value: '06', label: 'Junio' },
    { value: '07', label: 'Julio' }, { value: '08', label: 'Agosto' }, { value: '09', label: 'Septiembre' },
    { value: '10', label: 'Octubre' }, { value: '11', label: 'Noviembre' }, { value: '12', label: 'Diciembre' }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100%', overflow: 'hidden' }}>
      <nav className="glass-panel" style={{ borderRadius: 0, borderTop: 0, borderLeft: 0, borderRight: 0, padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 50 }}>
        <button onClick={() => navigate('/dashboard')} style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ArrowLeft size={20} />
          <span>Volver</span>
        </button>
        <h2 style={{ margin: 0, fontSize: '1.2rem', textAlign: 'center', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <DollarSign size={20} color="var(--primary)" /> Conciliación Contable
        </h2>
        <div style={{ width: '80px' }}></div>
      </nav>

      <main style={{ flex: 1, padding: '1.5rem', overflowY: 'auto' }}>
        <div className="container">
          
          {/* Controles de Filtro y Exportación */}
          <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Mes</label>
                <select 
                  value={selectedMonth} 
                  onChange={e => setSelectedMonth(e.target.value)}
                  className="input-field"
                  style={{ width: '150px', margin: 0, backgroundColor: 'var(--bg-dark)' }}
                >
                  {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Año</label>
                <select 
                  value={selectedYear} 
                  onChange={e => setSelectedYear(e.target.value)}
                  className="input-field"
                  style={{ width: '120px', margin: 0, backgroundColor: 'var(--bg-dark)' }}
                >
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button 
                onClick={handleExportCSV} 
                className="button" 
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#10b981', cursor: 'pointer' }}
                title="Descargar reporte en formato Excel/CSV"
              >
                <Download size={18} />
                Exportar CSV
              </button>
            </div>
          </div>

          {/* Resumen General */}
          <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem', borderLeft: '4px solid var(--primary)' }}>
            <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-muted)', fontSize: '1rem' }}>Total Cuentas por Pagar del Periodo</h3>
            <div style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--text-main)' }}>
              ${grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
          </div>

          {/* Tabla de Datos Agrupada */}
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
              <Loader2 className="animate-spin" size={32} color="var(--primary)" />
            </div>
          ) : filteredData.length === 0 ? (
            <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
              <Search size={48} color="var(--text-muted)" style={{ marginBottom: '1rem' }} />
              <h3 style={{ margin: 0 }}>No hay recepciones registradas</h3>
              <p style={{ color: 'var(--text-muted)' }}>Intenta seleccionar otro mes o año.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              {filteredData.map(group => (
                <div key={group.provider} className="glass-panel" style={{ padding: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1rem' }}>
                    <h3 style={{ margin: 0, color: 'var(--accent)', fontSize: '1.3rem' }}>{group.provider}</h3>
                    <div style={{ fontWeight: 700, fontSize: '1.2rem' }}>
                      Subtotal: ${group.subTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color)' }}>
                          <th style={{ padding: '0.75rem', fontWeight: 600 }}>Nº Factura / Pedido</th>
                          <th style={{ padding: '0.75rem', fontWeight: 600 }}>Fecha Recepción</th>
                          <th style={{ padding: '0.75rem', fontWeight: 600, textAlign: 'right' }}>Monto Aprobado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.items.map(item => (
                          <tr key={item.orderId} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <td style={{ padding: '0.75rem', fontWeight: 500 }}>{item.orderId}</td>
                            <td style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>{new Date(item.date).toLocaleDateString()}</td>
                            <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600, color: '#10b981' }}>
                              ${item.totalCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
          
        </div>
      </main>
    </div>
  );
};

export default Reconciliation;
