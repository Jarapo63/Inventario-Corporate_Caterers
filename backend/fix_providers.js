require('dotenv').config({ path: __dirname + '/.env' });
const { sheets, SHEET_ID } = require('./db');

const CATALOG_TABS = ['Drivers List', 'Kitchen List', 'Holiday'];

async function fixProviders() {
  try {
    // 1. Borrar lo que sea que haya en Proveedores A2:C para limpiar la basura
    await sheets.spreadsheets.values.clear({
      spreadsheetId: SHEET_ID,
      range: "'Proveedores'!A2:C"
    });

    let uniqueSet = new Set();

    // 2. Extraer única y exclusivamente de los TABS mencionados por el usuario
    for (let tab of CATALOG_TABS) {
      const resp = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: `'${tab}'!A:Z`
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
      console.log("No se encontraron proveedores para migrar en los TABS oficiales.");
      return;
    }

    console.log(`Migrando ${providersArray.length} proveedores LIMPIOS a la pestaña 'Proveedores'...`);
    
    const writeData = providersArray.map((prov, i) => {
      const idNumber = String(i + 1).padStart(3, '0');
      return [`PRV-${idNumber}`, prov, 'Activo'];
    });

    // Añadir al sheet
    await sheets.spreadsheets.values.append({
       spreadsheetId: SHEET_ID,
       range: "'Proveedores'!A:C",
       valueInputOption: 'USER_ENTERED',
       requestBody: { values: writeData }
    });

    console.log("Corrección completada con éxito. Proveedores limpios insertados.");

  } catch (err) {
    console.error("Error corrigiendo proveedores:", err.message);
  }
}

fixProviders();
