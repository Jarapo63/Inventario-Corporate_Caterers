import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, ArrowLeft, Plus, Edit2, Trash2, Save, X, Eye, EyeOff } from 'lucide-react';
import { fetchUsers, addUserAdmin, updateUserAdmin, deleteUserAdmin } from '../utils/api';
import { toast } from 'react-hot-toast';
import { confirmAction } from '../utils/toastHelpers';

const UserManager = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({ username: '', password: '', role: 'Subcheff' });
  const [isSaving, setIsSaving] = useState(false);

  const [editingRow, setEditingRow] = useState(null);
  const [editForm, setEditForm] = useState({});

  const [visiblePasswords, setVisiblePasswords] = useState({});

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const res = await fetchUsers();
      // Filtrar filas vacías
      const validUsers = (res.data || []).filter(u => u.username && u.username.trim() !== '');
      setUsers(validUsers);
    } catch (error) {
      console.error("Error al cargar usuarios:", error);
      toast.error("Error al cargar usuarios. Asegúrate de ser Administrador.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddNew = async () => {
    if (!addForm.username || !addForm.password || !addForm.role) {
      toast.error("Por favor llena todos los campos del nuevo usuario.");
      return;
    }
    
    setIsSaving(true);
    try {
      const res = await addUserAdmin({ ...addForm, username: addForm.username.trim() });
      const newUser = res.data;
      setUsers([...users, { ...newUser, permisos: '' }]);
      setAddForm({ username: '', password: '', role: 'Subcheff' });
      setShowAddForm(false);
    } catch (error) {
      console.error("Error agregando usuario:", error);
      toast.error(`Error al agregar usuario: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditClick = (user) => {
    setEditingRow(user.rowNum);
    setEditForm({ ...user });
  };

  const handleCancelEdit = () => {
    setEditingRow(null);
    setEditForm({});
  };

  const handleSaveEdit = async () => {
    if (!editForm.username || !editForm.password || !editForm.role) {
      toast.error("Los campos no pueden estar vacíos.");
      return;
    }

    setIsSaving(true);
    try {
      await updateUserAdmin(editForm.rowNum, { 
        username: editForm.username.trim(), 
        password: editForm.password, 
        role: editForm.role 
      });
      
      setUsers(prev => prev.map(u => u.rowNum === editForm.rowNum ? { ...editForm } : u));
      setEditingRow(null);
    } catch (error) {
      console.error("Error editando usuario:", error);
      toast.error(`Error al editar usuario: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (rowNum, username) => {
    confirmAction(`¿Estás seguro que deseas eliminar al usuario '${username}' permanentemente del sistema?`, async () => {
      setIsSaving(true);
      try {
        await deleteUserAdmin(rowNum);
        setUsers(prev => prev.filter(u => u.rowNum !== rowNum));
        toast.success(`Usuario ${username} eliminado`);
      } catch (error) {
        console.error("Error eliminando usuario:", error);
        toast.error(`Error al eliminar usuario: ${error.message}`);
      } finally {
        setIsSaving(false);
      }
    });
  };

  const togglePasswordVisibility = (rowNum) => {
    setVisiblePasswords(prev => ({ ...prev, [rowNum]: !prev[rowNum] }));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100%' }}>
      {/* Navbar */}
      <nav className="glass-panel" style={{ borderRadius: 0, borderTop: 0, borderLeft: 0, borderRight: 0, padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Users color="var(--primary)" />
          <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Administración de Usuarios y Permisos</h2>
        </div>
        <button className="btn-primary" style={{ width: 'auto' }} onClick={() => navigate('/dashboard')}>
           <ArrowLeft size={16} style={{ marginRight: '0.5rem' }}/> Volver al Dashboard
        </button>
      </nav>

      {/* Main Content */}
      <main style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
           <div>
             <h3 style={{ margin: 0, color: 'var(--text-main)' }}>Directorio de Empleados</h3>
             <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.875rem' }}>Gestiona los accesos, pines y roles de tus empleados. Recuerda que los passwords son visibles para ti como Administrador.</p>
           </div>
           {!showAddForm && (
             <button className="btn-primary" style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={() => setShowAddForm(true)}>
                <Plus size={18} /> Dar de Alta Empleado
             </button>
           )}
        </div>

        {showAddForm && (
          <div className="glass-panel animate-fade-in" style={{ padding: '2rem', marginBottom: '2rem', border: '1px solid var(--primary)', background: 'rgba(59, 130, 246, 0.05)' }}>
            <h4 style={{ margin: '0 0 1.5rem 0', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Plus size={20} /> Nuevo Empleado
            </h4>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>Usuario (Nick)</label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="Ej. CheffJuan"
                  value={addForm.username} 
                  onChange={e => setAddForm({...addForm, username: e.target.value})}
                  disabled={isSaving}
                />
              </div>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>Contraseña / PIN</label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="Ej. 1234"
                  value={addForm.password} 
                  onChange={e => setAddForm({...addForm, password: e.target.value})}
                  disabled={isSaving}
                />
              </div>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>Rol de Acceso</label>
                <select 
                  className="input-field" 
                  value={addForm.role}
                  onChange={e => setAddForm({...addForm, role: e.target.value})}
                  disabled={isSaving}
                >
                  <option value="Admin">Admin</option>
                  <option value="Manager">Manager</option>
                  <option value="Manager_Drivers">Manager_Drivers</option>
                  <option value="Manager_Kitchen">Manager_Kitchen</option>
                  <option value="Asistente">Asistente</option>
                  <option value="Subcheff">Subcheff</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn-primary" style={{ width: '120px' }} onClick={handleAddNew} disabled={isSaving}>
                  {isSaving ? 'Guardando...' : 'Guardar'}
                </button>
                <button className="btn-secondary" style={{ width: '100px', backgroundColor: 'var(--bg-dark)' }} onClick={() => setShowAddForm(false)} disabled={isSaving}>
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="glass-panel animate-fade-in" style={{ overflowX: 'auto' }}>
          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Cargando directorio de usuarios...</div>
          ) : users.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>No hay usuarios activos en el sistema. Vaya, deberías crearte uno.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '1rem' }}>Usuario (Nick)</th>
                  <th style={{ padding: '1rem' }}>Contraseña / PIN</th>
                  <th style={{ padding: '1rem' }}>Rol (Jerarquía)</th>
                  <th style={{ padding: '1rem', textAlign: 'center' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => {
                  const isEditing = editingRow === u.rowNum;
                  return (
                    <tr key={u.rowNum} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background-color 0.2s', backgroundColor: isEditing ? 'rgba(59, 130, 246, 0.1)' : 'transparent' }}>
                      <td style={{ padding: '1rem', fontWeight: 500, color: 'var(--text-main)' }}>
                        {isEditing ? (
                          <input type="text" className="input-field" style={{ margin: 0, padding: '0.4rem' }} value={editForm.username || ''} onChange={e => setEditForm({...editForm, username: e.target.value})} disabled={isSaving} />
                        ) : u.username}
                      </td>
                      <td style={{ padding: '1rem', color: 'var(--accent)', fontFamily: 'monospace', fontSize: '1.1rem' }}>
                        {isEditing ? (
                           <input type="text" className="input-field" style={{ margin: 0, padding: '0.4rem' }} value={editForm.password || ''} onChange={e => setEditForm({...editForm, password: e.target.value})} disabled={isSaving} />
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span>{visiblePasswords[u.rowNum] ? u.password : '••••••••'}</span>
                            <button onClick={() => togglePasswordVisibility(u.rowNum)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.2rem' }}>
                              {visiblePasswords[u.rowNum] ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        {isEditing ? (
                           <select className="input-field" style={{ margin: 0, padding: '0.4rem' }} value={editForm.role} onChange={e => setEditForm({...editForm, role: e.target.value})} disabled={isSaving}>
                             <option value="Admin">Admin</option>
                             <option value="Manager">Manager</option>
                             <option value="Manager_Drivers">Manager_Drivers</option>
                             <option value="Manager_Kitchen">Manager_Kitchen</option>
                             <option value="Asistente">Asistente</option>
                             <option value="Subcheff">Subcheff</option>
                           </select>
                        ) : (
                          <span style={{ 
                            padding: '0.2rem 0.6rem', 
                            borderRadius: '12px', 
                            fontSize: '0.8rem', 
                            backgroundColor: u.role === 'Admin' ? 'rgba(59, 130, 246, 0.2)' : u.role.includes('Manager') ? 'rgba(16, 185, 129, 0.2)' : u.role === 'Asistente' ? 'rgba(168, 85, 247, 0.2)' : 'rgba(234, 179, 8, 0.2)',
                            color: u.role === 'Admin' ? '#60a5fa' : u.role.includes('Manager') ? '#34d399' : u.role === 'Asistente' ? '#c084fc' : '#facc15'
                          }}>
                            {u.role}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'center' }}>
                        {isEditing ? (
                          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                            <button onClick={handleSaveEdit} disabled={isSaving} style={{ background: 'transparent', border: 'none', color: '#4ade80', cursor: 'pointer', padding: '0.4rem' }}>
                              <Save size={20} />
                            </button>
                            <button onClick={handleCancelEdit} disabled={isSaving} style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '0.4rem' }}>
                              <X size={20} />
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                            <button onClick={() => handleEditClick(u)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.4rem' }} className="hover:text-primary">
                              <Edit2 size={18} />
                            </button>
                            <button onClick={() => handleDelete(u.rowNum, u.username)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.4rem' }} className="hover:text-danger">
                              <Trash2 size={18} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
};

export default UserManager;
