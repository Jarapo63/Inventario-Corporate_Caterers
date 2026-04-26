import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit2, Check, X, PlusCircle, Loader2, Power, PowerOff } from 'lucide-react';
import { fetchProviders, addProvider, updateProvider } from '../utils/api';

const ProviderManager = () => {
  const navigate = useNavigate();
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [isAdding, setIsAdding] = useState(false);
  const [addForm, setAddForm] = useState({ idProv: '', nombre: '', estado: 'Activo' });

  const [editingRow, setEditingRow] = useState(null);
  const [editForm, setEditForm] = useState({ idProv: '', nombre: '', estado: '' });

  useEffect(() => {
    loadProviders();
  }, []);

  const loadProviders = async () => {
    try {
      setLoading(true);
      const { data } = await fetchProviders();
      setProviders(data || []);
    } catch (err) {
      alert(`Error cargando proveedores: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNew = async () => {
    if (!addForm.idProv || !addForm.nombre) {
      alert("ID y Nombre son obligatorios");
      return;
    }
    setIsSaving(true);
    try {
      await addProvider(addForm);
      await loadProviders();
      setIsAdding(false);
      setAddForm({ idProv: '', nombre: '', estado: 'Activo' });
    } catch (err) {
      alert(`Error creando proveedor: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveEdit = async (rowNum) => {
    setIsSaving(true);
    try {
      await updateProvider(rowNum, editForm);
      await loadProviders();
      setEditingRow(null);
    } catch (err) {
      alert(`Error actualizando: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async (prov) => {
    const newStatus = prov.estado === 'Activo' ? 'Inactivo' : 'Activo';
    if (!window.confirm(`¿Estás seguro de marcar el proveedor como ${newStatus}?`)) return;
    
    setIsSaving(true);
    try {
      await updateProvider(prov.rowNum, { idProv: prov.idProv, nombre: prov.nombre, estado: newStatus });
      await loadProviders();
    } catch (err) {
      alert(`Error cambiando estado: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading && providers.length === 0) {
    return <div className="container"><Loader2 className="animate-spin" color="var(--primary)" size={48} /></div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100%' }}>
      <nav className="glass-panel" style={{ borderRadius: 0, borderTop: 0, borderLeft: 0, borderRight: 0, padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 50 }}>
        <button onClick={() => navigate('/dashboard')} style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer', padding: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ArrowLeft size={20} />
          <span>Dashboard</span>
        </button>
        <h2 style={{ margin: 0, fontSize: '1.2rem', textAlign: 'center' }}>Directorio de Proveedores</h2>
        <div style={{ width: 80 }}></div>
      </nav>

      <main style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
        {!isAdding && (
          <button 
            onClick={() => setIsAdding(true)}
            className="btn-primary" 
            style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}
          >
            <PlusCircle size={20} /> Nuevo Proveedor
          </button>
        )}

        {isAdding && (
          <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem', border: '1px solid var(--accent)' }}>
            <h3 style={{ marginTop: 0 }}>Registrar Nuevo Proveedor</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
              <div><label>ID_Proveedor</label><input className="input-field" placeholder="Ej: PRV-001" value={addForm.idProv} onChange={e => setAddForm({...addForm, idProv: e.target.value})} /></div>
              <div><label>Nombre / Razón Social</label><input className="input-field" placeholder="Ej: Sysco Foods" value={addForm.nombre} onChange={e => setAddForm({...addForm, nombre: e.target.value})} /></div>
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="btn-primary" style={{ background: 'var(--accent)' }} onClick={handleAddNew} disabled={isSaving}>{isSaving ? 'Guardando...' : 'Crear'}</button>
              <button className="btn-primary" style={{ background: 'transparent', border: '1px solid var(--text-muted)' }} onClick={() => setIsAdding(false)}>Cancelar</button>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {providers.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No hay proveedores registrados aún.</p>
          ) : (
            providers.map((prov) => {
              const isEditing = editingRow === prov.rowNum;

              if (isEditing) {
                return (
                  <div key={prov.rowNum} className="glass-panel" style={{ padding: '1.5rem', border: '1px solid var(--primary)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem', marginBottom: '1rem' }}>
                      <div><label>ID_Proveedor</label><input className="input-field" value={editForm.idProv} onChange={e => setEditForm({...editForm, idProv: e.target.value})} /></div>
                      <div><label>Nombre</label><input className="input-field" value={editForm.nombre} onChange={e => setEditForm({...editForm, nombre: e.target.value})} /></div>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                      <button className="btn-primary" style={{ flex: 1, display: 'flex', justifyContent: 'center', gap: '0.5rem' }} onClick={() => handleSaveEdit(prov.rowNum)} disabled={isSaving}>
                        <Check size={18} /> {isSaving ? 'Guardando...' : 'Aplicar Cambios'}
                      </button>
                      <button className="btn-primary" style={{ flex: 1, background: 'rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'center', gap: '0.5rem' }} onClick={() => setEditingRow(null)}>
                        <X size={18} /> Cancelar
                      </button>
                    </div>
                  </div>
                );
              }

              const isInactive = prov.estado === 'Inactivo';

              return (
                <div key={prov.rowNum} className="glass-panel" style={{ padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: isInactive ? '4px solid var(--danger)' : '4px solid var(--primary)', opacity: isInactive ? 0.6 : 1 }}>
                  <div style={{ flex: 1 }}>
                    <span style={{ display: 'block', fontWeight: 600, fontSize: '1.1rem', color: isInactive ? 'var(--text-muted)' : 'var(--text-main)', textDecoration: isInactive ? 'line-through' : 'none' }}>
                      {prov.nombre}
                    </span>
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', display: 'block' }}>
                      ID: {prov.idProv} | Estado: <strong style={{ color: isInactive ? 'var(--danger)' : 'var(--primary)'}}>{prov.estado}</strong>
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button 
                      onClick={() => handleToggleStatus(prov)} 
                      title={isInactive ? 'Activar Proveedor' : 'Inactivar Proveedor'}
                      style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: isInactive ? '#10b981' : '#ef4444', padding: '0.75rem', borderRadius: '8px', cursor: 'pointer', transition: 'background 0.2s' }}
                    >
                      {isInactive ? <Power size={20} /> : <PowerOff size={20} />}
                    </button>
                    <button 
                      onClick={() => { setEditingRow(prov.rowNum); setEditForm({ ...prov }); }} 
                      title="Editar Nombre o ID"
                      style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', padding: '0.75rem', borderRadius: '8px', cursor: 'pointer', transition: 'background 0.2s' }}
                    >
                      <Edit2 size={20} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
};

export default ProviderManager;
