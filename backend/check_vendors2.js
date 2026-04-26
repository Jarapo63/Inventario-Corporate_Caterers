require('dotenv').config();
const { sheets, SHEET_ID } = require('./db');
const fs = require('fs');

async function checkVendors() {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: "'Vendors'!A:Z"
    });
    fs.writeFileSync('vendors_dump.json', JSON.stringify(response.data.values, null, 2));
    console.log("Dumped to vendors_dump.json");
  } catch (err) {
    fs.writeFileSync('vendors_error.txt', err.message);
    console.error("Error dumped to text");
  }
}

checkVendors();
