require('dotenv').config({ path: __dirname + '/.env' });
const { sheets, SHEET_ID } = require('./db');

async function migrate() {
  try {
    const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
    
    // Todas las pestañas que podrían tener productos (ej: Drinks List, etc)
    const dataSheets = meta.data.sheets.filter(s => 
      s.properties.title !== 'MOVIMIENTOS_INVENTARIO' && 
      s.properties.title !== 'Bitacora_Precios' &&
      s.properties.title !== 'Proveedores' &&
      s.properties.title !== 'RECEPCIONES_HISTORICO' &&
      s.properties.title !== 'ORDENES_COMPRA_HISTORICO'
    );

    let uniqueSet = new Set();

    for (let sheet of dataSheets) {
      const resp = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: `'${sheet.properties.title}'!A:Z`
      });
      const rows = resp.data.values || [];
      if (rows.length > 1) {
        rows.slice(1).forEach(row => {
          if (row[1] && row[1].trim() !== '') {
            uniqueSet.add(row[1].trim());
          }
        });
      }
    }

    const providersArray = Array.from(uniqueSet).sort();
    
    if (providersArray.length === 0) {
      console.log("No se encontraron proveedores para migrar.");
      return;
    }

    console.log(`Migrando ${providersArray.length} proveedores a la pestaña 'Proveedores'...`);
    
    const writeData = providersArray.map((prov, i) => {
      const idNumber = String(i + 1).padStart(3, '0');
      return [`PRV-${idNumber}`, prov, 'Activo'];
    });

    // Añadir al sheet (se asume que la cabecera ya existe en la fila 1)
    await sheets.spreadsheets.values.append({
       spreadsheetId: SHEET_ID,
       range: "'Proveedores'!A:C",
       valueInputOption: 'USER_ENTERED',
       requestBody: { values: writeData }
    });

    console.log("Migración completada con éxito.");

  } catch (err) {
    console.error("Error durante migración:", err.message);
  }
}

migrate();
