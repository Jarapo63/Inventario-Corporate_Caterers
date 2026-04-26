const { sheets, SHEET_ID } = require('../db');

const getProviders = async (req, res) => {
  try {
    const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
    const exists = meta.data.sheets.some(s => s.properties.title === 'Proveedores');
    
    if (!exists) {
      // Crear hoja dinámicamente si no existe
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SHEET_ID,
        requestBody: {
          requests: [{
            addSheet: { properties: { title: 'Proveedores' } }
          }]
        }
      });
      await sheets.spreadsheets.values.update({
        spreadsheetId: SHEET_ID,
        range: "'Proveedores'!A1:C1",
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [['ID_Proveedor', 'Nombre', 'Estado']] }
      });
      return res.status(200).json({ data: [] });
    }

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: "'Proveedores'!A:C"
    });

    const rows = response.data.values || [];
    if (rows.length <= 1) return res.status(200).json({ data: [] });

    // Procesar datos
    const providers = rows.slice(1).map((row, index) => ({
      rowNum: index + 2,
      idProv: row[0] || '',
      nombre: row[1] || '',
      estado: row[2] || 'Activo'
    }));

    res.status(200).json({ data: providers });
  } catch (error) {
    console.error('Error fetching providers:', error);
    res.status(500).json({ message: 'Error interno obteniendo proveedores.' });
  }
};

const addProvider = async (req, res) => {
  const { idProv, nombre, estado } = req.body;
  if (!idProv || !nombre) {
    return res.status(400).json({ message: 'ID y Nombre son obligatorios.' });
  }

  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: "'Proveedores'!A:C",
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [[idProv, nombre, estado || 'Activo']] }
    });
    res.status(201).json({ message: 'Proveedor creado exitosamente.' });
  } catch (error) {
    res.status(500).json({ message: 'Error interno creando proveedor.' });
  }
};

const updateProvider = async (req, res) => {
  const { rowNum } = req.params;
  const { idProv, nombre, estado } = req.body;

  try {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `'Proveedores'!A${rowNum}:C${rowNum}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [[idProv, nombre, estado]] }
    });
    res.status(200).json({ message: 'Proveedor actualizado.' });
  } catch (error) {
    res.status(500).json({ message: 'Error interno actualizando proveedor.' });
  }
};

module.exports = { getProviders, addProvider, updateProvider };
