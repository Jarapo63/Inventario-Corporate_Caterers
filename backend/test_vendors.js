const { sheets, SHEET_ID } = require('./db');

async function checkVendors() {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: "'Vendors'!A:Z"
    });
    console.log(response.data.values);
  } catch (err) {
    console.log("Error or Sheet not found:", err.message);
  }
}

checkVendors();
