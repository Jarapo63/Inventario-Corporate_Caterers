# Manual Paso a Paso: Instalación de la Aplicación para tu Cliente

Este tutorial está diseñado para alguien sin experiencia técnica previa. Te guiará paso a paso para tomar la aplicación de tu computadora y llevarla ""a la nube"", permitiendo que el equipo de tu cliente pueda acceder a ella desde cualquier teléfono, tablet o computadora con internet.

La aplicación consta de 3 grandes piezas:
1. **La Base de Datos (Google Sheets)**
2. **El Cerebro/Servidor (Backend)**
3. **La Interfaz Visual (Frontend)**

---

## ⭐️ PARTE 0: Crear el Robot de Conexión (Google Cloud)

Si núnca has creado una credencial técnica para que la App hable internamente con Google Sheets (o deseas que la cuenta le pertenezca a tu cliente en lugar de a ti), deberás crear un "Robot Autorizado" (Cuenta de Servicio).

**Paso A: Ingreso y Creación del Proyecto**
1. Ve a la [Consola de Google Cloud](https://console.cloud.google.com/) e inicia sesión.
2. Haz clic en el menú desplegable superior izquierdo que dice **"Seleccionar un proyecto"** y luego en **"PROYECTO NUEVO"**.
3. Llámalo "Inventario App" y dale Crear. Una vez que termine, asegúrate de tenerlo seleccionado en la barra superior.

**Paso B: Habilitar la conexión con Google Sheets**
1. En la barra de búsqueda superior, escribe **"Google Sheets API"** y selecciona el primer resultado bajo "Marketplace".
2. Presiona el botón azul **"HABILITAR"** (Enable).

**Paso C: Crear el "Robot"**
1. Ve al menú lateral izquierdo (3 rayitas) -> **"APIs y servicios"** -> **"Credenciales"**.
2. Haz clic en la parte superior en **"+ CREAR CREDENCIALES"** -> **"Cuenta de servicio"**.
3. Ponle un nombre (ej. `robot-inventario`).
4. **IMPORTANTE:** Copia o anota el correo electrónico largo que se genera abajo (ej. `robot-inventario@...iam.gserviceaccount.com`). Te servirá en el siguiente paso.
5. Haz clic en **"Crear y Continuar"** y luego en **"Listo"**.

**Paso D: Obtener las Contraseñas (Llaves JSON)**
1. En la misma pantalla, abajo en la lista bajo "*Cuentas de servicio*", verás el correo recién creado. Haz clic en él o en el ícono del lápiz para editarlo.
2. Dirígete a la pestaña **"CLAVES"** (Keys).
3. Da clic en **"AGREGAR CLAVE"** -> **"Crear clave nueva"** -> Elige el formato **JSON** y dale crear.
4. Se descargará un archivo a tu computadora automáticamente. Si lo abres, vendrá la `PRIVATE_KEY` y el correo del robot. ¡Cuida este archivo!

> [!WARNING]
> **POSIBLE BLOQUEO EN CUENTAS EMPRESARIALES**
> Si al intentar descargar la clave recibes el error: *"La creación de claves de la cuenta de servicio está inhabilitada. Se aplicó una política de la organización..."*, significa que la empresa bloqueó la extracción de credenciales por seguridad.
> 
> **Solución 1 (La más rápida y fácil): Usar una cuenta personal**
> Google Sheets no exige que el Robot provenga de la misma empresa. Cierra sesión y entra a Google Cloud con un correo personal normal (`@gmail.com`). Sigue todos estos pasos de la Parte 0 allí. Al terminar y pasar a la **PARTE 1**, simplemente dale permisos de "Editor" en el Excel corporativo al nuevo correo del Robot personal. ¡Funcionará perfecto y no necesitas pedir permisos a sistemas!
> 
> **Solución 2 (Vía oficial de IT):**
> Contacta al administrador de correos/Google Workspace de la empresa y solicítale: *"Debido a la integración de una App con Google Sheets vía API, solicito que desactiven temporalmente la política de organización `iam.disableServiceAccountKeyCreation` en mi proyecto de Google Cloud, o alternativamente que un administrador me genere directamente la clave JSON de la Cuenta de Servicio."*

---

## ⭐️ PARTE 1: Configurar la Base de Datos (Google Sheets)

1. Entra a la cuenta de Google Drive de tu cliente (o la tuya, si administrarás el servidor).
2. Crea un **nuevo archivo de Google Sheets** en blanco. Llámalo "Base de Datos Inventario".
3. Mira la barra de direcciones de tu navegador. La URL se verá algo así:
   `https://docs.google.com/spreadsheets/d/1XyZabcd12345efgh6789/edit...`
   *Copia toda esa secuencia larga de letras y números* (lo que está entre `/d/` y `/edit`). Ese es tu **SHEET_ID**. Guárdalo en un bloc de notas.
4. **Permisos de Servicio**: Ahora con tu archivo de Llaves listo, necesitas conectar tu Excel con ese Robot para que pueda modificar datos dentro de él:
   * Pulsa el botón verde de "Compartir" en el Google Sheet recién creado.
   * Pega allí "Correo Rarísimo" (el Client Email `tu-app@proyecto.iam.gserviceaccount...`) resultante de la PARTE CERO y dale permisos de **"Editor"**.
   * *(Con esto, tu Servidor ahora tiene permiso oficial de escribir en el Google Sheet del cliente).*

---

## ⭐️ PARTE 2: Subir el Cerebro a Internet (Backend)

Tu backend necesita vivir en un servidor prendido 24/7. Usaremos **Render.com**, es gratuito y muy fácil.

### A. Preparando el código
1. Debes subir las dos carpetas (`backend` y `frontend`) a una cuenta de **GitHub**. Si no sabes cómo, [aquí tienes un tutorial básico de GitHub Desktop](https://desktop.github.com/).

### B. Creando el Servidor Web (Render)
1. Entra a [Render.com](https://render.com/) y crea una cuenta gratuita usando GitHub.
2. Haz clic en **New +** y selecciona **"Web Service"**.
3. Conecta tu repositorio de GitHub y selecciona la carpeta de tu código.
4. En la configuración que aparece, llena lo siguiente:
   - **Name:** backend-inventario (o lo que quieras).
   - **Root Directory:** `backend` (importante).
   - **Environment:** Node.
   - **Build Command:** `npm install`
   - **Start Command:** `node index.js`
   - **Instance Type:** Free (Gratis).

5. Desplázate hacia abajo hasta **"Environment Variables"** (Variables de Entorno). Aquí pondrás tus secretos, tal como lo hacías en tu computadora:
   - Añade `PORT` y ponle `10000`.
   - Añade `GOOGLE_SHEET_ID` y pega el ID que copiaste en el Paso 1.
   - Añade `GOOGLE_SERVICE_ACCOUNT_EMAIL` y pega ese correo especial de IAM.
   - Añade `GOOGLE_PRIVATE_KEY` y pega el bloque enorme entero que dice BEGIN PRIVATE KEY (asegúrate de copiarlo exacto, con todo y los guiones).
   - Añade `JWT_SECRET` y aquí inventa una frase secreta loca (ej. `mi_secreto_super_seguro_123`).

6. Da click en **"Create Web Service"**. Tardará unos 5 minutos construyendo. Al final te dará un link: `https://backend-inventario.onrender.com`. ¡Cópialo!

---

## ⭐️ PARTE 3: Subir la Interfaz a Internet (Frontend)

La interfaz vivirá en **Vercel.com** o **Netlify.com** (ambos gratuitos para interfaces). Usaremos Vercel.

1. Entra a [Vercel.com](https://vercel.com/) y créate una cuenta ligada a tu mismo GitHub.
2. Haz clic en **"Add New Project"**.
3. Selecciona el repositorio de GitHub donde subiste tu código.
4. En **"Root Directory"**, selecciona la carpeta `frontend`.
5. En la sección **"Environment Variables"**, vas a pegar la conexión vital con el cerebro que creamos arriba:
   - Nombre: `VITE_API_URL`
   - Valor: Pega el link de Render que te dio en el Paso 2 (ej. `https://backend-inventario.onrender.com/api`). **(Ojo: Asegúrate de agregarle `/api` al final).**

6. Da click en **Deploy**. 
En un par de minutos, Vercel te regalará una dirección pública en internet (algo como `tunombre-inventario.vercel.app`).

---

## ⭐️ PASO 4: Preparación Final de la Base de Datos (Semilla)

La primera vez que entres a la interfaz (la dirección de Vercel), la App conectará con un Google Sheet en blanco.

1. Ve a tu antiguo Google Sheet local y copia las hojas de Catálogo base (`Kitchen List`, `Drivers List` y `Holiday`), cuidando que mantengan esos nombres exactos en la pestaña de abajo.
2. Entra a tu App (Vercel) y registra al primer Administrador maestro desde la Interfaz u Otórgale permisos directamente editando la fila en tu nueva hoja "Permisos" que deberá contar con las columnas ["Empleados", "Contraseñas/PIN", "Rol", "Permisos"].

¡Felicidades! Todo el equipo de tu cliente ya puede sacar su teléfono, entrar a la página web que les dio Vercel, iniciar sesión, y manejar el inventario corporativo en vivo.
