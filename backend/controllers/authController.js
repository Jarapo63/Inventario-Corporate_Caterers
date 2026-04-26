const { sheets, SHEET_ID } = require('../db');
const jwt = require('jsonwebtoken');

const login = async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: 'Usuario y contraseña son requeridos' });
  }

  try {
    // Leemos la pestaña de Permisos asumiendo la estructura: A=Usuario, B=Password, C=Rol
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: 'Permisos!A2:C' 
    });

    const rows = response.data.values || [];
    
    // Buscamos coincidencia exacta ignorando espacios al inicio o final
    const cleanUsername = username.trim();
    const cleanPassword = password.trim();
    const user = rows.find(row => (row[0] || '').trim() === cleanUsername && (row[1] || '').trim() === cleanPassword);

    if (!user) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    const role = user[2] || 'Subcheff'; // Por defecto asume menor privilegio

    // Generamos el JWT Token
    const token = jwt.sign(
      { username, role },
      process.env.JWT_SECRET,
      { expiresIn: '12h' } // Las sesiones en cocina pueden ser largas
    );

    res.status(200).json({
      message: 'Autenticación exitosa',
      token,
      user: { username, role }
    });
  } catch (error) {
    console.error('Error en Login AuthController:', error.message);
    res.status(500).json({ message: `Error conectando a Sheets: ${error.message}` });
  }
};

const getUsers = async (req, res) => {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: 'Permisos!A:D'
    });
    
    const rows = response.data.values || [];
    if (rows.length <= 1) return res.status(200).json({ data: [] });
    
    const users = rows.slice(1).map((row, index) => ({
      rowNum: index + 2,
      username: row[0] || '',
      password: row[1] || '',
      role: row[2] || 'Subcheff',
      permisos: row[3] || ''
    }));
    
    res.status(200).json({ data: users });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Error interno obteniendo usuarios' });
  }
};

const addUser = async (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password || !role) {
    return res.status(400).json({ message: 'Todos los campos son obligatorios' });
  }
  
  try {
    const newValues = [username, password, role, ''];
    const appendRes = await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: 'Permisos!A:D',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [newValues] }
    });
    
    const match = appendRes.data.updates.updatedRange.match(/!A(\d+)/);
    const rowNum = match ? parseInt(match[1]) : null;
    
    res.status(200).json({ message: 'Usuario creado exitosamente', data: { rowNum, username, password, role } });
  } catch (error) {
    console.error('Error añadiendo usuario:', error);
    res.status(500).json({ message: 'Error interno creando usuario' });
  }
};

const updateUser = async (req, res) => {
  const { rowNum } = req.params;
  const { username, password, role } = req.body;
  
  if (!rowNum || !username || !password || !role) {
    return res.status(400).json({ message: 'Parámetros incompletos' });
  }
  
  try {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `Permisos!A${rowNum}:D${rowNum}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [[username, password, role, '']] }
    });
    
    res.status(200).json({ message: 'Usuario actualizado con éxito' });
  } catch (error) {
    console.error('Error actualizando usuario:', error);
    res.status(500).json({ message: 'Error interno actualizando usuario' });
  }
};

const deleteUser = async (req, res) => {
  const { rowNum } = req.params;
  if (!rowNum) {
    return res.status(400).json({ message: 'Row number es requerido' });
  }
  
  try {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `Permisos!A${rowNum}:D${rowNum}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [['', '', '', '']] } // Soft delete effectively
    });
    res.status(200).json({ message: 'Usuario eliminado' });
  } catch (error) {
    console.error('Error eliminando usuario:', error);
    res.status(500).json({ message: 'Error interno al intentar eliminar' });
  }
};

module.exports = { login, getUsers, addUser, updateUser, deleteUser };
