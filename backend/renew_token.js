const { google } = require('googleapis');
const express = require('express');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = 3001;

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `http://localhost:${PORT}/oauth2callback`
);

const scopes = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.readonly'
];

app.get('/oauth2callback', async (req, res) => {
  const code = req.query.code;
  if (!code) {
    return res.status(400).send('No se encontró el código de autorización en la URL.');
  }

  try {
    const { tokens } = await oauth2Client.getToken(code);
    if (!tokens.refresh_token) {
      return res.send(`
        <h1>⚠️ Falta Refresh Token</h1>
        <p>Google no envió un nuevo refresh token porque esta app ya tenía permisos concedidos.</p>
        <p>Por favor, ve a <a href="https://myaccount.google.com/permissions" target="_blank">Tu cuenta de Google > Seguridad</a>, elimina el acceso para "Corporate Caterers" (o el nombre de tu app), y vuelve a intentarlo.</p>
      `);
    }

    // Actualizar .env
    const envPath = path.join(__dirname, '.env');
    let envData = fs.readFileSync(envPath, 'utf8');
    
    // Buscar y reemplazar la linea
    const regex = /GOOGLE_REFRESH_TOKEN=(.*)/;
    if (regex.test(envData)) {
      envData = envData.replace(regex, `GOOGLE_REFRESH_TOKEN="${tokens.refresh_token}"`);
    } else {
      envData += `\nGOOGLE_REFRESH_TOKEN="${tokens.refresh_token}"`;
    }
    
    fs.writeFileSync(envPath, envData);

    res.send(`
      <div style="font-family: sans-serif; text-align: center; margin-top: 50px;">
        <h1 style="color: green;">✅ ¡Token actualizado con éxito!</h1>
        <p>El archivo <strong>.env</strong> ha sido actualizado automáticamente.</p>
        <p>El código generado fue: <code>${tokens.refresh_token.substring(0,20)}...</code></p>
        <p style="font-weight: bold;">Ya puedes cerrar esta ventana y regresar a la aplicación.</p>
      </div>
    `);

    setTimeout(() => {
      console.log('✅ Token guardado. Apagando servidor local.');
      process.exit(0);
    }, 1500);
    
  } catch (error) {
    console.error(error);
    res.status(500).send('Error intentando obtener el token: ' + error.message);
  }
});

app.listen(PORT, () => {
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent'
  });
  console.log('====================================================');
  console.log('🔌 Servidor local de renovación de token iniciado.');
  console.log('Por favor haz clic (Cmd + Clic) en el siguiente enlace:');
  console.log('\n', url, '\n');
  console.log('====================================================');
});
