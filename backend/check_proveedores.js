require('dotenv').config({ path: __dirname + '/.env' });
const { sheets, SHEET_ID } = require('./db');

async function go() {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: "'Proveedores'!A:C"
    });
    console.log(response.data.values ? response.data.values.slice(0, 10) : 'Empty');
  } catch (err) {
    console.error("Error:", err.message);
  }
}
go();
