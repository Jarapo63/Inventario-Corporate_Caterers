const { google } = require('googleapis');
require('dotenv').config();

let authClient;

if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
  // Use Service Account (Production / Deployment)
  authClient = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      // Manejar saltos de línea explícitos o literales que ocurren al pegar en Render
      private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n')
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });
} else {
  // Use OAuth2 (Local Development fallback)
  authClient = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
  authClient.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN
  });
}

// Inicializar la API de Sheets
const sheets = google.sheets({ version: 'v4', auth: authClient });
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
