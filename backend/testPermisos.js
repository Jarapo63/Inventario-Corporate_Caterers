const { sheets, SHEET_ID } = require('./db');

async function check() {
  const meta = await sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: 'Permisos!A:D' });
  console.log(meta.data.values);
}

check();
