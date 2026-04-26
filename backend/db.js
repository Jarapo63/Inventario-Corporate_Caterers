const { google } = require('googleapis');
require('dotenv').config();

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// Establecer credenciales globales usando el Refresh Token
oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN
});

// Inicializar la API de Sheets
const sheets = google.sheets({ version: 'v4', auth: oauth2Client });
const SHEET_ID = process.env.GOOGLE_SHEET_ID;

// Función de prueba para verificar conexión
async function testConnection() {
  try {
    const response = await sheets.spreadsheets.get({
      spreadsheetId: SHEET_ID
    });
    console.log(`✅ Conexión exitosa a la hoja: ${response.data.properties.title}`);
    return true;
  } catch (error) {
    console.error('❌ Error conectando a Sheets:', error.message);
    return false;
  }
}

module.exports = {
  sheets,
  SHEET_ID,
  testConnection
};
