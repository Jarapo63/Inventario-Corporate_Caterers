const { sheets, SHEET_ID } = require('./db');
const fs = require('fs');

(async () => {
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: "'MOVIMIENTOS_INVENTARIO'!A1:Z5"
    });
    fs.writeFileSync('sheet_dump_mov.json', JSON.stringify(res.data, null, 2));
    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
})();
