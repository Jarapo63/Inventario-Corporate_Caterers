const { sheets, SHEET_ID } = require('../db');

const updateProduct = async (req, res) => {
  const { sheetName, rowNum, newValues, oldPrice, newPrice, productId, productName, provider, idProv } = req.body;
  
  if (!sheetName || !rowNum || !newValues) {
    return res.status(400).json({ message: 'Faltan parámetros de actualización.' });
  }

  try {
    const requestsData = [
      { range: `'${sheetName}'!B${rowNum}`, values: [[newValues[1]]] }, // Proveedor
      { range: `'${sheetName}'!C${rowNum}`, values: [[newValues[2]]] }, // Nombre
      { range: `'${sheetName}'!D${rowNum}`, values: [[newValues[3]]] }, // UOM
      { range: `'${sheetName}'!E${rowNum}`, values: [[newValues[4]]] }, // Cantidad Dentro
      { range: `'${sheetName}'!F${rowNum}`, values: [[newValues[5]]] }, // Id_Prod_Prov
      { range: `'${sheetName}'!G${rowNum}`, values: [[newValues[6]]] }, // Área
      { range: `'${sheetName}'!H${rowNum}`, values: [[newValues[7]]] }, // Min Stock
      { range: `'${sheetName}'!I${rowNum}`, values: [[newValues[8]]] }, // Precio
      { range: `'${sheetName}'!J${rowNum}`, values: [[`=IF(INDIRECT("E"&ROW())>0, INDIRECT("I"&ROW())/INDIRECT("E"&ROW()), 0)`]] }, // Precio Pieza
      { range: `'${sheetName}'!K${rowNum}`, values: [[newValues[10] && newValues[10] !== "" ? newValues[10] : "Activo"]] } // Estatus Activo/Inactivo
    ];

    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: {
        valueInputOption: 'USER_ENTERED',
        data: requestsData
      }
    });
    
    // 2. Si se enviaron metadatos de precio y hay fluctuación, escribir a bitácora
    if (oldPrice !== undefined && newPrice !== undefined && String(oldPrice) !== String(newPrice)) {
      // Verificar dinámicamente si la pestaña existe
      const sheetMeta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
      const sheetExists = sheetMeta.data.sheets.some(s => s.properties.title === 'Bitacora_Precios');
      
      if (!sheetExists) {
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId: SHEET_ID,
          requestBody: { requests: [{ addSheet: { properties: { title: 'Bitacora_Precios' } } }] }
        });
        await sheets.spreadsheets.values.update({
          spreadsheetId: SHEET_ID,
          range: "'Bitacora_Precios'!A1:H1",
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: [['Fecha', 'Usuario', 'Proveedor', 'Id_Prod_Prov', 'ID_Producto', 'Producto', 'Precio_Anterior', 'Precio_Nuevo']] }
        });
      }

      const timestamp = new Date().toISOString();
      await sheets.spreadsheets.values.append({
        spreadsheetId: SHEET_ID,
        range: "'Bitacora_Precios'!A:H",
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [[timestamp, req.user ? req.user.username : 'Sistema', provider || '-', idProv || '-', productId, productName, oldPrice, newPrice]] }
      });
    }
    
    res.status(200).json({ message: 'Producto actualizado con éxito.' });
  } catch (error) {
    console.error('Error actualizando producto:', error.message);
    res.status(500).json({ message: `API Error: ${error.message}` });
  }
};

const addProduct = async (req, res) => {
  const { sheetName, newValues } = req.body;
  if (!sheetName || !newValues) {
    return res.status(400).json({ message: 'Faltan datos para crear producto.' });
  }

  try {
    const appendRes = await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: `'${sheetName}'!A:A`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [newValues] }
    });
    
    // Inyectar fórmulas en la fila recién creada
    const updatedRange = appendRes.data.updates.updatedRange;
    if (updatedRange) {
      const match = updatedRange.match(/!A(\d+)/);
      if (match && match[1]) {
        const rowNum = match[1];
        const formulaRequests = [
          { range: `'${sheetName}'!J${rowNum}`, values: [[`=IF(INDIRECT("E"&ROW())>0, INDIRECT("I"&ROW())/INDIRECT("E"&ROW()), 0)`]] }
        ];

        if (formulaRequests.length > 0) {
          await sheets.spreadsheets.values.batchUpdate({
            spreadsheetId: SHEET_ID,
            requestBody: { valueInputOption: 'USER_ENTERED', data: formulaRequests }
          });
        }
      }
    }
    
    res.status(200).json({ message: 'Nuevo producto creado en el sistema.' });
  } catch (error) {
    console.error('Error insertando nuevo producto:', error.message);
    res.status(500).json({ message: 'No se pudo crear el elemento en la base.' });
  }
};

module.exports = { updateProduct, addProduct };
