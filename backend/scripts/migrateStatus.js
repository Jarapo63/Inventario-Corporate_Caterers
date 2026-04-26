const { sheets, SHEET_ID } = require('../db');

const CATALOG_TABS = ['Drivers List', 'Kitchen List', 'Holiday'];

async function migrate() {
  try {
    for (const tab of CATALOG_TABS) {
      console.log(`Leyendo pestaña ${tab}...`);
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: `'${tab}'!A:Z`
      });

      const rows = response.data.values;
      if (!rows || rows.length <= 1) continue;

      const requestsData = [];
      // Empezamos desde la línea 2 (índice 1) asumiendo que 1 es el header
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        // Revisamos si la columna K (index 10) está vacía y si la fila es válida (tiene un ID)
        if (row[0] && row[0].trim() !== '') {
           const currentStatus = row[10] ? row[10].trim() : '';
           // Si está vacía, preparamos batchUpdate para inyectarle "Activo" en Columna K
           if (!currentStatus) {
             requestsData.push({
               range: `'${tab}'!K${i + 1}`,
               values: [['Activo']]
             });
           }
        }
      }

      if (requestsData.length > 0) {
        console.log(`Escribiendo "Activo" en ${requestsData.length} filas de la pestaña ${tab}...`);
        await sheets.spreadsheets.values.batchUpdate({
          spreadsheetId: SHEET_ID,
          requestBody: {
            valueInputOption: 'USER_ENTERED',
            data: requestsData
          }
        });
        console.log(`Migración de ${tab} exitosa.`);
      } else {
        console.log(`No hay filas vacías en columna K para ${tab}.`);
      }
    }
    console.log("¡MIGRACIÓN COMPLETA!");
  } catch (err) {
    console.error("Error durante migración:", err);
  }
}

migrate();
