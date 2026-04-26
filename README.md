# Corporate Caterers - Sistema Integral de Inventario y Operaciones

![Corporate Caterers](https://img.shields.io/badge/Corporate_Caterers-Inventory_App-0f172a?style=for-the-badge)

La aplicación **Corporate Caterers Inventory Management** es una solución PWA (Progressive Web App) y sistema robusto de back-office diseñado específicamente para controlar los flujos de almacén, órdenes a proveedores, recepciones de camiones y análisis financiero de mercancía (Food & Beverage) utilizando un entorno tecnológico híbrido.

---

## 🛠️ Stack Tecnológico

### Frontend
- **React.js** (Vite): Biblioteca principal para la interfaz de usuario.
- **React Router**: Para navegación ágil (Single Page Application).
- **Lucide React**: Biblioteca de iconografía moderna.
- **Recharts**: Para módulos de inteligencia de negocios y analítica matemática.
- **CSS3 Moderno**: UI estructurada con variables dinámicas, "Glassmorphism", soporte visual responsivo y Dark Mode estricto.

### Backend
- **Node.js + Express**: Servidor ligero de alta velocidad.
- **Google Sheets API v4**: Funciona como motor de Inteligencia y Base de Datos (DB) sin servidor. Toda transacción queda congelada y es traqueable en libros compartidos de excel.
- **JWT (Json Web Tokens)**: Implementación de autenticación de estado desconectado y validación de sesiones en capa media.
- **Crypto**: Encriptación local de secretos y accesos.

---

## 📋 Arquitectura de la Base de Datos (Google Sheets)

El backend no requiere hospedar SQL/NoSQL. Se asienta en una Hoja de Cálculo central estructurada en las siguientes hojas cardinales:

1. **Drivers List | Kitchen List | Holiday:** Catálogos maestros donde viven nombres, precios base, cantidades dentro de empaque, ubicación física *(Min Stock)*, y ahora el status de producto (Activo/Inactivo) en la Columna K.
2. **Permisos:** Gestor de credenciales planas con PIN rápido y Roles del personal (Admin, Manager, Asistente, Subcheff).
3. **PROVEEDORES:** Directorio CRUD de firmas proveedoras con flags de activación para selección cruzada durante la creación de productos.
4. **ORDENES_COMPRA_HISTORICO:** Libro inmutable que graba quién ordenó qué, en qué cantidad (Stock Target) basando su matriz en órdenes del tipo `Sem-DDMMAAAA-001` o Extraordinarias `Ext-DDMMAAAA-001`. Soporta edición en línea de cantidades por administradores para corregir facturación.
5. **RECEPCIONES_HISTORICO:** Ledger secundario que cruza el ID del Pedido con lo que se entregó físicamente por el camión. Soporta estatus cruzados de entrega Parcial, Resoluciones y Cancelación Definitiva.
6. **MOVIMIENTOS_INVENTARIO:** Tabla unificada (Contabilidad) la cual mediante sintaxis nativa de Google calcula el *% de Sobre Stock* y el *Valor Final del Inventario* sumando el físico inicial más el recibido en la puerta.
7. **Bitacora_Precios:** Guarda el historial milimétrico de discrepancias y modificaciones pasadas del Master Catalog midiendo inflación/tendencias porcentuales.

---

## 🔄 Flujos Operativos Estándar (End-to-End)

### 1. Levantamiento Semanal (Jueves)
El flujo detona mediante un escaneo físico. El operador entra al **Inventario Semanal**, donde las agrupaciones lo guían por las divisiones del almacén *(Walk-In, Freezer, Front, etc)*. Al solicitar faltantes basados en su "Mínimo de Anaquel", el servidor inyecta una pre-orden transaccional.

### 2. Pedidos Extraordinarios
Si existe un quiebre de stock a mitad de semana, la App permite generar recargas individuales independientes del ciclo Jueves.

### 3. Reportes de Pedido (Validación al Proveedor)
Para evitar corrupciones de datos en la recepción, los administradores acuden primero a la vista **Reporte de Pedidos**. Allí filtran lo solicitado por la matriz operativa y utilizan "Checks" interactivos para constatar mental o burocráticamente que esa mercancía ya ha sido *Llamada/Confirmada* al proveedor. 

### 4. Flujo de Recepción y Cancelación
Solo lo que cruzó el "Check" en Reportes aparecerá en Recepción. Al llegar un camión:
- Si falta inventario esperado frente a lo llegado, el sistema detecta un **Extravío o Faltante**.
- Los faltantes transitan a "Mercancía Faltante / Cancelada". 
- Allí un administrador decide en frío:
    - **Cancelar Definitivamente:** Anula el pasivo y recorta la proforma contable original.
    - **Re-Pedido Extraordinario:** Auto-genera un resurtido inyectando métricas pre-validadas a un ticket transaccional nuevo con el remanente por obtener.

### 5. Reportes de Analítica
Todas las piezas caen matemáticamente a este módulo en tiempo real. 
- Demuestra las órdenes totales y unidades físicas que han traspasado las puertas.
- Re-calcula la variante de Inversión Estacionada por *Area Física* y *Catálogo*.
- Registra el cierre de inventario financiero en línea de tiempo (Gráfico de Barras Mensuales).
- Una Bitácora Tabular documenta los saltos tarifarios en el mercado.

---

## 🚀 Instalación y Despliegue

### Requisitos
- Node.js `v18.x` o superior.
- Credenciales tipo *Service Account* de Google Cloud de la API (JSON file).
- Archivo `.env` propiamente estructurado.

### Configuración Local

1. **Clonar Repositorio / Navegar a la carpeta madre.**
2. **Instalación Backend:**
   ```bash
   cd backend
   npm install
   ```
3. **Instalación Frontend:**
   ```bash
   cd frontend
   npm install
   ```

4. **Variables de Entorno (`backend/.env`):**
   ```env
   PORT=5001
   GOOGLE_SERVICE_ACCOUNT_EMAIL="tu_cuenta@tu-proyecto.iam.gserviceaccount.com"
   GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nTU_LLAVE\n-----END PRIVATE KEY-----"
   GOOGLE_SHEET_ID="EL_ID_DE_TU_EXCEL_COMPARTIDO"
   JWT_SECRET="una_llave_encriptacion_super_segura"
   ```

5. **Arranque en Torrente (Modo Desarrollo):**
   Terminal 1 (Backend):
   ```bash
   cd backend
   npm start # ó node index.js
   ```
   Terminal 2 (Frontend):
   ```bash
   cd frontend
   npm run dev
   ```

---

## 🔒 Aspectos de Seguridad de Roles

El sistema interrumpe el acceso horizontal basándose en cuatro jerarquías:
- **Admin**: Acceso absoluto a todo el sistema operativo: Catálogo Maestro, Directorio de Proveedores, Administración de Personal, Monitoreo Analítico Financiero, Reportes de Pedidos (con capacidad de edición en línea de cantidades) y Flujos de Recepción.
- **Manager**: Jerarquía operativa primordial. Habilitado para hacer "Realizar Ciclo Semanal" (captura de inventario), levantar órdenes al proveedor, y contrastar o recibir las llegadas físicas a la puerta en el módulo de Recepción. 
- **Asistente**: Rol de apoyo administrativo táctico enfocado en mantenimiento de bases de datos. Faculta acceso exclusivo y compartido (junto al Admin) a la edición en la "Gestión de Catálogo" y al "Directorio de Proveedores".
- **Subcheff**: Rol estricto de recepción logística. El único panel que este perfil vislumbra en el Dashboard es la "Recepción de Pedidos" para validar y dar ingreso exclusivamente a la mercancía que descarga el camión del proveedor. Aislado por completo del resto del ecosistema financiero.

## 📝 Notas de Mantenimiento

- **Fórmulas Indirect:** La integridad económica y matemática *depende* de que el archivo base en Excel nunca corrompa sus fórmulas generadas. La hoja interconecta `N * (H + J)` en los márgenes backend para garantizar la rentabilidad estática.
- **Evitar Nulos Ocultos:** No borrar celdas en el master catalog de manera agresiva. Desactivar un proveedor inactivará visualmente los productos cascada para evitar quiebres.
