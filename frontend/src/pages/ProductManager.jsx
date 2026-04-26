import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit2, Check, X, PlusCircle, Loader2 } from 'lucide-react';
import { fetchCatalog, updateProduct, addProduct, fetchProviders } from '../utils/api';
import { toast } from 'react-hot-toast';

const ProductManager = () => {
  const navigate = useNavigate();
  const [catalog, setCatalog] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  
  // Estado para el ítem en edición
  const [editingIdx, setEditingIdx] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  // Estado para un nuevo ítem
  const [isAdding, setIsAdding] = useState(false);
  const [addForm, setAddForm] = useState({ 
    id: '', prov: '', idProv: '', name: '', uom: '', minStock: '', price: '', qtyInside: '1', area: '' 
  });

  const getNextId = (tab, targetArea) => {
    const items = catalog[tab] || [];
    let max = 0;
    let prefix = '';

    if (targetArea) {
      for (let i = 1; i < items.length; i++) {
        const area = (items[i][6] || '').trim();
        if (area.toLowerCase() === targetArea.toLowerCase()) {
          const idStr = items[i][0] || '';
          const match = idStr.match(/^([A-Za-z]+)-?\s*(\d+)$/);
          if (match) {
            if (!prefix) prefix = match[1];
            const num = parseInt(match[2], 10);
            if (num > max) max = num;
          }
        }
      }
    }

    if (!prefix) {
      for (let i = 1; i < items.length; i++) {
        const idStr = items[i][0] || '';
        const match = idStr.match(/^([A-Za-z]+)-?\s*(\d+)$/);
        if (match) {
          if (!prefix) prefix = match[1];
          const num = parseInt(match[2], 10);
          if (num > max) max = num;
        }
      }
    }
    return prefix ? `${prefix}-${max + 1}` : `ID-${items.length}`;
  };

  const handleStartAdd = () => {
    setAddForm({ id: getNextId(activeTab, ''), prov: '', idProv: '', name: '', uom: '', minStock: '', price: '', qtyInside: '1', area: '' });
    setIsAdding(true);
  };

  const [activeProviders, setActiveProviders] = useState([]);

  useEffect(() => {
    loadCatalog();
    loadActiveProviders();
  }, []);

  const loadActiveProviders = async () => {
    try {
      const { data } = await fetchProviders();
      setActiveProviders((data || []).filter(p => p.estado === 'Activo').map(p => p.nombre).sort());
    } catch (err) {
      console.warn("Error cargando proveedores activos:", err);
    }
  };

  const loadCatalog = async () => {
    try {
      setLoading(true);
      const { data } = await fetchCatalog();
      setCatalog(data);
      if (Object.keys(data).length > 0) {
        setActiveTab(Object.keys(data)[0]);
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (idx, originalRow) => {
    setEditingIdx(idx);
    setEditForm({
      prov: originalRow[1] || '',
      name: originalRow[2] || '',
      uom: originalRow[3] || '',
      qtyInside: originalRow[4] || '1',
      idProv: originalRow[5] || '',
      area: originalRow[6] || '',
      minStock: originalRow[7] || '',
      price: originalRow[8] || '',
      status: originalRow[10] || 'Activo'
    });
  };

  const handleSaveEdit = async (idx, originalRow) => {
    setIsSaving(true);
    const newRow = [...originalRow];
    
    // Necesitamos llegar al índice 10 (11 columnas)
    while(newRow.length <= 10) newRow.push("");
    
    newRow[1] = editForm.prov;
    newRow[2] = editForm.name;
    newRow[3] = editForm.uom;
    newRow[4] = editForm.qtyInside !== '' ? parseFloat(editForm.qtyInside) : 1;
    newRow[5] = editForm.idProv;
    newRow[6] = editForm.area;
    newRow[7] = editForm.minStock !== '' ? parseFloat(editForm.minStock) : '';
    newRow[8] = editForm.price !== '' ? parseFloat(editForm.price) : '';
    newRow[10] = editForm.status;

    try {
      const parsedOld = originalRow[8] ? parseFloat(String(originalRow[8]).replace(/[^\d.-]/g, '')) || 0 : 0;
      const parsedNew = newRow[8] ? parseFloat(String(newRow[8]).replace(/[^\d.-]/g, '')) || 0 : 0;

      const priceMetadata = {
         oldPrice: parsedOld,
         newPrice: parsedNew,
         productId: originalRow[0],
         productName: newRow[2],
         provider: newRow[1],
         idProv: newRow[5]
      };

      await updateProduct(activeTab, idx + 2, newRow, priceMetadata);
      
      // Forzar recarga completa desde Google Sheets para recuperar el Costo matemático derivado
      await loadCatalog();
      setEditingIdx(null);
    } catch (err) {
      toast.error(`Error al guardar: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddNew = async () => {
    setIsSaving(true);
    const newRow = new Array(11).fill("");
    newRow[0] = addForm.id;
    newRow[1] = addForm.prov;
    newRow[2] = addForm.name;
    newRow[3] = addForm.uom;
    newRow[4] = addForm.qtyInside !== '' ? parseFloat(addForm.qtyInside) : 1;
    newRow[5] = addForm.idProv;
    newRow[6] = addForm.area; // Área Física
    newRow[7] = addForm.minStock;
    newRow[8] = addForm.price;
    newRow[10] = 'Activo';

    try {
      await addProduct(activeTab, newRow);
      await loadCatalog();
      setIsAdding(false);
      setAddForm({ id: '', prov: '', name: '', uom: '', minStock: '', price: '', qtyInside: '1', area: '' });
    } catch (err) {
      toast.error(`Error creando producto: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return <div className="container"><Loader2 className="animate-spin" color="var(--primary)" size={48} /></div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100%' }}>
      {/* Header Navigation */}
      <nav className="glass-panel" style={{ borderRadius: 0, borderTop: 0, borderLeft: 0, borderRight: 0, padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 50 }}>
        <button onClick={() => navigate('/dashboard')} style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer', padding: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ArrowLeft size={20} />
          <span>Dashboard</span>
        </button>
        <h2 style={{ margin: 0, fontSize: '1.2rem', textAlign: 'center' }}>Catálogo Maestro</h2>
        <div style={{ width: 80 }}></div>
      </nav>

      {/* Tabs / Area Selector */}
      <div style={{ padding: '1rem', overflowX: 'auto', display: 'flex', gap: '0.5rem' }}>
        {Object.keys(catalog).map(tab => (
          <button 
            key={tab}
            onClick={() => { setActiveTab(tab); setEditingIdx(null); setIsAdding(false); }}
            style={{ 
              padding: '0.5rem 1rem', borderRadius: '20px', border: '1px solid var(--primary)', 
              background: activeTab === tab ? 'var(--primary)' : 'transparent',
              color: 'white', cursor: 'pointer', whiteSpace: 'nowrap'
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      <main style={{ flex: 1, padding: '1rem', overflowY: 'auto' }}>
        {!isAdding && (
          <button 
            onClick={handleStartAdd}
            className="btn-primary" 
            style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}
          >
            <PlusCircle size={20} /> Agregar Ítem a {activeTab}
          </button>
        )}

        {isAdding && (
          <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem', border: '1px solid var(--accent)' }}>
            <h3 style={{ marginTop: 0 }}>Nuevo Producto en {activeTab}</h3>
            
            <datalist id="providers-list">
              {activeProviders.map(p => <option key={p} value={p} />)}
            </datalist>
            <datalist id="areas-list">
              {[...new Set((catalog[activeTab] || []).slice(1).map(r => (r[6] || '').trim()).filter(Boolean))].map(a => <option key={a} value={a} />)}
            </datalist>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
              <div><label>ID / Clave</label><input className="input-field" value={addForm.id} onChange={e => setAddForm({...addForm, id: e.target.value})} /></div>
              <div><label>Proveedor</label><input list="providers-list" className="input-field" value={addForm.prov} onChange={e => setAddForm({...addForm, prov: e.target.value})} placeholder="Elegir o escribir..." /></div>
              <div><label>Id_Prod_Prov</label><input className="input-field" value={addForm.idProv} onChange={e => setAddForm({...addForm, idProv: e.target.value})} /></div>
              <div><label>Área</label><input list="areas-list" className="input-field" value={addForm.area} onChange={e => {
                 const newArea = e.target.value;
                 setAddForm({...addForm, area: newArea, id: getNextId(activeTab, newArea) });
              }} placeholder="Ej. Cooler" /></div>
              <div style={{ gridColumn: '1 / -1' }}><label>Nombre Completo</label><input className="input-field" value={addForm.name} onChange={e => setAddForm({...addForm, name: e.target.value})} /></div>
              <div><label>U. Medida</label><input className="input-field" value={addForm.uom} onChange={e => setAddForm({...addForm, uom: e.target.value})} /></div>
              <div><label>Cant. Dentro</label><input className="input-field" type="number" step="1" value={addForm.qtyInside} onChange={e => setAddForm({...addForm, qtyInside: e.target.value})} /></div>
              <div><label>Min Stock</label><input className="input-field" type="number" step="1" value={addForm.minStock} onChange={e => setAddForm({...addForm, minStock: e.target.value})} /></div>
              <div><label>Precio Unit.</label><input className="input-field" type="number" step="0.01" value={addForm.price} onChange={e => setAddForm({...addForm, price: e.target.value})} /></div>
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="btn-primary" style={{ background: 'var(--accent)' }} onClick={handleAddNew} disabled={isSaving}>{isSaving ? 'Guardando...' : 'Crear'}</button>
              <button className="btn-primary" style={{ background: 'transparent', border: '1px solid var(--text-muted)' }} onClick={() => setIsAdding(false)}>Cancelar</button>
            </div>
          </div>
        )}

        {/* Listado de Productos Existentes */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {(() => {
            const rows = catalog[activeTab] || [];
            if (rows.length <= 1) return <p style={{ color: 'var(--text-muted)' }}>No hay productos en {activeTab}</p>;
            
            const areaOrder = [];
            const groupedByArea = {};
            
            rows.slice(1).forEach((row, idx) => {
               const originalIdx = idx;
               const isInactive = (row[10] || '').trim().toLowerCase() === 'inactivo';
               
               if (!showInactive && isInactive) return;
               
               const areaName = (row[6] || 'Sin Área').trim();
               if (!groupedByArea[areaName]) {
                   groupedByArea[areaName] = [];
                   areaOrder.push(areaName);
               }
               groupedByArea[areaName].push({ row, originalIdx, isInactive });
            });

            return (
              <div style={{ marginBottom: '2rem' }}>
                <div style={{ position: 'sticky', top: '-1rem', background: 'var(--bg-dark)', zIndex: 20, paddingBottom: '0.6rem', borderBottom: '2px solid #4ade80', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ color: '#4ade80', margin: 0, textTransform: 'uppercase', letterSpacing: '1px' }}>
                    Catálogo: {activeTab}
                  </h3>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer', color: 'var(--text-muted)' }}>
                    <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} style={{ cursor: 'pointer' }}/> Mostrar Inactivos
                  </label>
                </div>
                
                {areaOrder.map(areaName => (
                  <div key={areaName} style={{ marginBottom: '2.5rem', paddingLeft: '0.5rem', paddingTop: '1rem' }}>
                    <h4 style={{ color: '#fbbf24', borderLeft: '4px solid #fbbf24', paddingLeft: '0.5rem', marginBottom: '1rem', fontSize: '1.05rem', letterSpacing: '0.5px' }}>
                      Área: {areaName}
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {groupedByArea[areaName].map(({row, originalIdx, isInactive}) => {
                        const isEditing = editingIdx === originalIdx;

                        if (isEditing) {
                          return (
                            <div key={originalIdx} className="glass-panel" style={{ padding: '1.5rem', border: '1px solid var(--primary)', borderLeft: '3px solid var(--primary)' }}>
                              <div style={{ marginBottom: '1rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>ID: {row[0]}</div>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                                <div style={{ gridColumn: '1 / -1' }}><label>Producto</label><input className="input-field" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} /></div>
                                <div><label>Proveedor</label><input list="providers-list" className="input-field" value={editForm.prov} onChange={e => setEditForm({...editForm, prov: e.target.value})} /></div>
                                <div><label>Id_Prod_Prov</label><input className="input-field" value={editForm.idProv} onChange={e => setEditForm({...editForm, idProv: e.target.value})} /></div>
                                <div><label>Área Fca.</label><input className="input-field" value={editForm.area} onChange={e => setEditForm({...editForm, area: e.target.value})} /></div>
                                <div><label>Unidad</label><input className="input-field" value={editForm.uom} onChange={e => setEditForm({...editForm, uom: e.target.value})} /></div>
                                <div><label>Cant. Dentro</label><input className="input-field" type="number" step="1" value={editForm.qtyInside} onChange={e => setEditForm({...editForm, qtyInside: e.target.value})} /></div>
                                <div><label>Min Stock</label><input className="input-field" type="number" step="1" value={editForm.minStock} onChange={e => setEditForm({...editForm, minStock: e.target.value})} /></div>
                                <div><label>Precio Unit.</label><input className="input-field" type="number" step="0.01" value={editForm.price} onChange={e => setEditForm({...editForm, price: e.target.value})} /></div>
                                <div>
                                  <label>Estado</label>
                                  <select className="input-field" value={editForm.status} onChange={e => setEditForm({...editForm, status: e.target.value})}>
                                    <option value="Activo">Activo</option>
                                    <option value="Inactivo">Inactivo</option>
                                  </select>
                                </div>
                              </div>
                              <div style={{ display: 'flex', gap: '1rem' }}>
                                <button className="btn-primary" style={{ flex: 1, display: 'flex', justifyContent: 'center', gap: '0.5rem' }} onClick={() => handleSaveEdit(originalIdx, row)} disabled={isSaving}>
                                  <Check size={18} /> {isSaving ? 'Guardando...' : 'Aplicar'}
                                </button>
                                <button className="btn-primary" style={{ flex: 1, background: 'rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'center', gap: '0.5rem' }} onClick={() => setEditingIdx(null)}>
                                  <X size={18} /> Cancelar
                                </button>
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div key={originalIdx} className="glass-panel" style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: '3px solid rgba(251, 191, 36, 0.4)', opacity: isInactive ? 0.6 : 1, filter: isInactive ? 'grayscale(0.5)' : 'none' }}>
                            <div style={{ flex: 1 }}>
                              <span style={{ display: 'block', fontWeight: 600, fontSize: '1.05rem', lineHeight: '1.3' }}>
                                {row[2] || 'Sin Nombre'}
                                {isInactive && <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', background: 'var(--danger)', color: 'white', padding: '0.1rem 0.4rem', borderRadius: '4px', verticalAlign: 'text-bottom' }}>INACTIVO</span>}
                              </span>
                              <span style={{ fontSize: '0.95rem', color: 'var(--text-muted)', marginTop: '0.3rem', display: 'block' }}>
                                ID: <span style={{color:'var(--primary)'}}>{row[0]}</span> | Id_Prod_Prov: {row[5] || '-'} | Req. Base: <span style={{color:'var(--accent)', fontWeight:600}}>{row[7] || '-'}</span> | Precio: ${parseFloat(row[8] || 0).toFixed(2)}
                              </span>
                            </div>
                            <button onClick={() => handleEditClick(originalIdx, row)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', padding: '0.5rem', borderRadius: '50%', cursor: 'pointer', marginLeft: '1rem' }}>
                              <Edit2 size={18} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      </main>
    </div>
  );
};

export default ProductManager;
