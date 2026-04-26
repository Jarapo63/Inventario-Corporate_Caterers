const { google } = require('googleapis');
const readline = require('readline');
require('dotenv').config();

// Configura 'urn:ietf:wg:oauth:2.0:oob' si usaste 'App de Escritorio' 
// o la URL si usaste 'Aplicación Web'.
const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/oauth2callback';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  redirectUri
);

const scopes = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.readonly'
];

const url = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: scopes,
  prompt: 'consent' // Forza a que Google nos entregue el Refesh Token
});

console.log('==============================================');
console.log('Por favor, autoriza a la app visitando esta URL:');
console.log(url);
console.log('==============================================');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question('\nCopia la URL exacta a la que te redirigió el navegador (o el parámetro "code") y pégala aquí:\n> ', async (inputVal) => {
  try {
    // Extraer el código si el usuario pegó toda la URL
    let code = inputVal;
    if (inputVal.includes('code=')) {
      const urlParams = new URLSearchParams(inputVal.split('?')[1]);
      code = urlParams.get('code');
    }

    const { tokens } = await oauth2Client.getToken(code);
    
    if (tokens.refresh_token) {
      console.log('\n✅ ¡ÉXITO! Copia lo siguiente e insértalo en tu archivo .env del backend:');
      console.log(`\nGOOGLE_REFRESH_TOKEN="${tokens.refresh_token}"\n`);
    } else {
      console.log('\n⚠️ ADVERTENCIA: No se deolvió un refresh token. Esto pasa si ya habías autorizado la app antes. Ve a tu cuenta de Google > Seguridad > Apps con acceso, desconecta la app, y corre este script nuevamente.');
    }
  } catch (error) {
    console.error('❌ Error al canjear el código:', error.message);
  } finally {
    rl.close();
  }
});
