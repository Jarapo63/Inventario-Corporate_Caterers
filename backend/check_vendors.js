require('dotenv').config();
const { sheets, SHEET_ID } = require('./db');

async function checkVendors() {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: "'Vendors'!A:Z"
    });
    console.log(JSON.stringify(response.data.values, null, 2));
  } catch (err) {
    console.error("Error or Sheet not found:", err.message);
  }
}

checkVendors();
