require('dotenv').config();
const { sheets, SHEET_ID } = require('./db');

async function setAllProductsActive() {
  try {
    const res = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
    const sheetNames = res.data.sheets.map(s => s.properties.title);
    
    // Ignoramos pestañas de configuración y transaccionales
    const excluded = ['Permisos', 'Vendors', 'Bitacora_Precios', 'MOVIMIENTOS_INVENTARIO', 'ORDENES_COMPRA_HISTORICO'];
    const catalogSheets = sheetNames.filter(name => !excluded.includes(name));

    for (const sheet of catalogSheets) {
      console.log(`Leyendo datos de la pestaña: ${sheet}...`);
      const dataRes = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: `'${sheet}'!A:Z`
      });
      
      const rows = dataRes.data.values;
      if (!rows || rows.length <= 1) {
        console.log(`No hay productos a modificar en ${sheet}. Saltando.`);
        continue;
      }
      
      const updates = [];
      // Empezamos en i = 1 (Fila 2 en Google Sheets) para omitir el Header
      for (let i = 1; i < rows.length; i++) {
        const rowNum = i + 1; // Google Sheets row (1-indexed)
        // Columna Q es 'Status' en la hoja de Catálogo
        updates.push({
          range: `'${sheet}'!Q${rowNum}`,
          values: [['Activo']]
        });
      }
      
      if (updates.length > 0) {
        console.log(`Actualizando ${updates.length} productos en ${sheet}...`);
        await sheets.spreadsheets.values.batchUpdate({
          spreadsheetId: SHEET_ID,
          requestBody: {
            valueInputOption: 'USER_ENTERED',
            data: updates
          }
        });
      }
    }

    console.log('¡Sincronización masiva de Status a "Activo" finalizada con éxito!');
  } catch (error) {
    console.error('Error durante la sincronización masiva:', error);
  }
}

setAllProductsActive();
