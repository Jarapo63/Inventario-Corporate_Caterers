const { sheets, SHEET_ID } = require('./db');
const fs = require('fs');

(async () => {
  try {
    console.log('Fetching ranges...');
    const res = await sheets.spreadsheets.values.batchGet({
      spreadsheetId: SHEET_ID,
      ranges: ["'Drivers List'!A1:Z10", "'Kitchen List'!A1:Z10"]
    });
    fs.writeFileSync('sheet_dump.json', JSON.stringify(res.data, null, 2));
    console.log("DONE");
    process.exit(0);
  } catch(e) {
    fs.writeFileSync('sheet_dump.json', JSON.stringify({ error: e.message }, null, 2));
    console.error(e);
    process.exit(1);
  }
})();
