# Documentación Técnica y Operativa: Inventario Corporate Caterers

Este documento recopila la arquitectura técnica, la estructura de la base de datos (Google Sheets) y los flujos operativos de la aplicación **Inventario Corporate Caterers**. Fue diseñado para servir como manual de referencia para futuras integraciones, clonaciones del sistema o auditorías.

---

## 1. Arquitectura del Sistema

La plataforma está diseñada utilizando una arquitectura "Serverless / PaaS" de tres capas, lo que garantiza bajo costo, alta disponibilidad y mantenimiento cero de servidores físicos.

1.  **Frontend (Interfaz de Usuario):**
    *   **Tecnología:** React.js con Vite.
    *   **Estilos:** CSS puro (Vanilla) utilizando variables CSS para un diseño moderno con componentes translúcidos.
    *   **Hospedaje:** **Vercel** (Actualización automática mediante GitHub CI/CD).
2.  **Backend (Lógica y API):**
    *   **Tecnología:** Node.js con Express.js.
    *   **Seguridad:** JWT (JSON Web Tokens) para autenticación y `bcrypt` para encriptado de contraseñas.
    *   **Hospedaje:** **Render** Web Services (Actualización automática mediante GitHub CI/CD).
3.  **Base de Datos:**
    *   **Tecnología:** **Google Sheets API v4**.
    *   **Ventaja:** Permite que los administradores puedan auditar o rescatar datos directamente en una hoja de cálculo sin necesidad de conocimientos en bases de datos SQL, al mismo tiempo que el backend procesa toda la lógica transaccional y financiera.

---

## 2. Estructura de la Base de Datos (Google Sheets)

La aplicación depende de un único archivo de Google Sheets (`SHEET_ID`). Las siguientes pestañas (`Sheets`) y sus encabezados son obligatorios para el correcto funcionamiento del sistema:

### Catálogos de Productos
Pestañas: `Drivers List`, `Kitchen List`, `Holiday`, `Special Request`
*   **Columnas:** `ID` | `Proveedor` | `Producto` | `UOM` | `Qty Inside` | `ID Prov` | `Área` | `Min Stock` | `Precio` | `InventarioFisico` | `Status`
*   *Nota:* La columna `InventarioFisico` es volátil, se usa temporalmente durante la captura semanal. La columna `Status` (`Activo` / `Inactivo`) dicta si el producto se muestra en la aplicación (Soft Delete).

### Gestión de Usuarios (`Usuarios`)
*   **Columnas:** `ID` | `Usuario` | `Password` (Hash encriptado) | `Role` | `Estado`
*   **Roles Soportados:** `Admin`, `Manager`, `Manager_Drivers`, `Manager_Kitchen`, `Asistente`, `Subcheff`.

### Directorio de Proveedores (`Proveedores`)
*   **Columnas:** `ID` | `Nombre` | `Email` | `Teléfono` | `Estado`

### Bitácora de Precios (`Bitacora_Precios`)
*   **Columnas:** `Producto` | `Proveedor` | `Id_Producto` | `Fecha` | `Precio_Anterior` | `Nuevo_Precio` | `Variacion_Porcentaje`
*   *Uso:* Se alimenta automáticamente desde el Catálogo cuando se modifica el precio de un producto existente.

### Transaccional: Órdenes de Compra (`ORDENES_COMPRA_HISTORICO`)
*   **Columnas:** `ID_Pedido` | `Fecha` | `Usuario` | `Proveedor` | `Id_Prod_Prov` | `ID_Producto` | `Producto` | `Área` | `Orden` | `Precio` | `Costo` | `Capturado`
*   *Uso:* Almacena todo lo que el sistema sugiere comprar (Semanales), lo extraordinario (Ext) y los pedidos especiales (SR). La columna `Capturado` actúa como puente de autorización hacia el módulo de Recepción.

### Transaccional: Recepción (`RECEPCIONES_HISTORICO`)
*   **Columnas:** `ID_Pedido` | `Fecha` | `Usuario` | `ID_Producto` | `Producto` | `Orden` | `Recibido` | `Status_Recepción`
*   *Uso:* Registra lo que físicamente llegó. Si lo Recibido es menor a la Orden, el `Status_Recepción` cambia a `Revisar`.

### Transaccional: Auditoría Financiera (`MOVIMIENTOS_INVENTARIO`)
*   **Columnas:** `ID_Pedido` | `Fecha` | `Usuario` | `Tipo` (Semanales, Ext, SR, Recepción) | `ID_Producto` | `Producto` | `Área` | `Min Stock` | `Cantidad Pedida` | `Cantidad Recibida` | `Cantidad Dentro` | `En Stock` | `% Sobre Stock` | `Precio Base` | `Valor Inventario`
*   *Uso:* Es el "Gran Libro Mayor" del sistema. Cada acción registra el valor del inventario en ese instante exacto para alimentar las gráficas de Analítica Financiera de forma estática y 100% auditable.

---

## 3. Flujos Operativos Core

### A. Ciclo de Inventario Semanal
1.  **Captura (`InventoryCapture.jsx`):** Un `Manager` o `Admin` entra a su área designada, cuenta lo que hay físicamente en los anaqueles y el sistema hace la resta automática: `Requerimiento = Min Stock - Inventario Físico`.
2.  **Submit:** Al cerrar la sesión de captura, el sistema inyecta las órdenes en `ORDENES_COMPRA_HISTORICO` bajo un `ID_Pedido` consolidado (ej. `Sem-15052026-001`).

### B. Ciclo de Pedidos Especiales (SR)
1.  **Carrito de Compras (`ProductManager.jsx`):** El usuario va a la pestaña `Special Request` y agrega múltiples productos temporalmente a su carrito. El `Min Stock` se asume como 0 internamente para no afectar cálculos futuros.
2.  **Submit:** Al cerrar, se agrupan en un `ID_Pedido` que inicia con `SR-` y se inyectan tanto en el catálogo vivo como en las Órdenes Históricas.

### C. Puente de Aprobación (Reportes -> Recepción)
*   **Registro de Pedidos (`ReportsOrders.jsx`):** El `Admin` o rol autorizado revisa los pedidos (Semanales, Extras, SR). Al confirmar que ya realizó la compra en las páginas web de sus proveedores, hace "Check" en el ítem.
*   **Estado Interno:** Ese check cambia la columna `Capturado` a `TRUE` en la base de datos.
*   **Recepción (`Reception.jsx`):** El sistema **solo** despliega en recepción las órdenes que tienen el estatus `TRUE` de capturado, garantizando que el personal de cocina solo reciba lo que ya fue oficialmente comprado.

### D. Conciliación y Analítica Financiera
*   **Reconciliation (`Reconciliation.jsx`):** Analiza exclusivamente lo que se recibió en `RECEPCIONES_HISTORICO`, lo agrupa por Proveedor y por Mes/Año para cuadrar facturas y calcular Cuentas por Pagar reales. Permite exportar en CSV.
*   **Analytics (`Analytics.jsx`):** Escanea el Libro Mayor (`MOVIMIENTOS_INVENTARIO`) para dibujar la fluctuación de precios histórica y la inversión "En Stock" agrupada por Catálogos y Áreas Físicas, usando sistemas de "Fallback" para mantener la integridad de los datos a lo largo de los años.

---

## 4. Variables de Entorno (Environment Variables)

Para desplegar este sistema para un nuevo cliente o en un nuevo entorno, se deben configurar estrictamente estas variables en **Render** (Backend):

*   `GOOGLE_CREDENTIALS`: JSON de la cuenta de servicio de Google Cloud (`Service Account`), codificado en formato Base64.
*   `SHEET_ID`: El ID alfanumérico único que aparece en la URL del archivo de Google Sheets de la base de datos del cliente.
*   `JWT_SECRET`: Una cadena de texto segura para encriptar las sesiones (ej. `SuperSecretInventarioCorporate2026!`).
*   `PORT`: `5000` (Render lo inyecta automáticamente).
*   `FRONTEND_URL`: La URL pública de Vercel (ej. `https://inventario-corporate.vercel.app`) para habilitar CORS de forma segura y evitar bloqueos del navegador.

Y en **Vercel** (Frontend):

*   `VITE_API_URL`: La URL pública que te otorga Render (ej. `https://corporate-backend-xx9x.onrender.com/api`).

---

## 5. Mantenimiento y Respaldos

*   **Código Fuente:** Todo el código (Frontend y Backend) está versionado y respaldado de manera segura en **GitHub**.
*   **Base de Datos (Google Sheets):** Al utilizar Google Sheets, el propio Google crea un historial de versiones automáticamente (`Archivo` > `Historial de versiones`), lo que permite recuperar datos borrados accidentalmente o visualizar qué usuario modificó una celda específica a través de los años.
*   **Clonación a Nuevos Clientes (Multi-Tenant manual):** Solo se requiere duplicar el archivo de Google Sheets vacío (para obtener un nuevo `SHEET_ID`), crear un nuevo repositorio en GitHub con el código actual, y conectar nuevas instancias gratuitas/básicas en Vercel y Render. El sistema actuará como un ecosistema aislado y altamente seguro.
