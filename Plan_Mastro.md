Documento de Especificaciones y Requerimientos (DER)
Proyecto: Sistema de Control de Inventarios Corporate Caterers
Tecnología: Google Sheets + Antigravity (Web App)
Idioma: Español
1. Arquitectura de Datos (Google Sheets)
El sistema utilizará un modelo relacional basado en las hojas del archivo "Inventario". Se implementará una estructura Padre-Hijo para separar la configuración de productos de los movimientos transaccionales.
1.1. Tablas Maestras (Catálogos)
Productos (Drivers List, Kitchen List, Holiday): Contienen la definición técnica de los artículos.
Proveedores (Vendors): Listado oficial de proveedores.
Usuarios y Permisos (Permisos): Control de acceso por rol (Admin, Asistente, Manager, Subcheff).
1.2. Tablas Transaccionales (Históricos)
Bitácora de Precios: Registro de cambios de Precio y Precio Pieza con marca de tiempo.
Órdenes de Compra: Registro de requerimientos semanales y extraordinarios.
Recepciones: Registro de ingresos de mercancía con estampa de fecha/hora.
Movimientos de Inventario: Relación detallada de entradas y salidas para análisis mensual.
2. Definición de Conceptos y Lógica de Negocio
Se integrarán los siguientes campos con su respectiva lógica programática:
Campo
Lógica / Regla de Negocio
ID_Producto
Identificador único (Llave primaria).
Área
Ubicación física. Se debe respetar el orden jerárquico del archivo original incluso al añadir nuevos ítems.
Requerimiento
Campo editable. Se limpia automáticamente al iniciar un nuevo ciclo de inventario (Jueves).
Orden
Refleja la necesidad final de compra basada en el Requerimiento.
Costo
Cálculo calculado: Orden * Precio.
En Stock
Fórmula: ((Precio * Cantidad Dentro) + Min Stock).
Sobre Stock
Porcentaje de volumen: Cantidad Dentro / En Stock.
Status
Dinámico:

- Si Orden = 0 o vacío $\rightarrow$ "Sin orden"

- Si Recibido = Orden $\rightarrow$ "OK"

- Si Recibido $\neq$ Orden $\rightarrow$ "Revisar"
Precio Pieza
Cálculo: Precio / Cantidad Dentro.

3. Funcionalidades de la Aplicación Web
3.1. Gestión de Inventario Semanal (Ciclo del Jueves)
Captura Fluida: Interfaz optimizada para dispositivos móviles/tablets que permita el recorrido físico en el almacén respetando el orden de las áreas.
Congelamiento de Datos: Al cerrar el inventario del jueves, el sistema debe "congelar" los precios y cantidades actuales en la tabla de Histórico de Movimientos.
Requerimientos Extraordinarios: Formulario independiente para generar órdenes de compra fuera del ciclo semanal, vinculándose automáticamente a la tabla de Recepciones.
3.2. Gestión de Compras y Recepción
Emisión de Orden: Generación de reporte de solicitud de compra agrupado por Proveedor.
Módulo de Recepción: Interfaz para el Staff de cocina donde capturan la cantidad física recibida.
Estampa de Tiempo: Al marcar como "Recibido", el sistema graba automáticamente Fecha de Recepción (DD/MM/AAAA HH:MM).
3.3. Administración y Seguridad
Control de Acceso: * Admin: Edición total de estructura, productos, áreas, unidades de medida y mínimos. Acceso a reportes globales.
Manager/Subcheff: Solo captura de requerimientos y recepción de productos.
Mantenimiento de Catálogo: Espacio para dar de alta/baja productos sin romper la integridad referencial de los históricos.

3.4. Gestión Integral de Doble Estatus (Catálogo vs Compras)
La plataforma opera obligatoriamente con una lógica de doble estado paralelo para gobernar las reglas de negocio, tal como se define en la Sección 2:
* **Status de Producto (Maestro):** Parámetro booleano (Activo/Inactivo) alojado en las hojas del Catálogo Madre. Define la visibilidad global de un insumo; su alteración está encapsulada a niveles de Administrador.
* **Status de Recepción (Transaccional):** Métrica dinámica y matemática ("Sin orden", "OK", "Revisar") evaluada directamente en la confirmación de la orden de compra tras contrastar físicamente la 'Cantidad Pedida' (Orden) contra la 'Cantidad Entregada' (Recibido).

4. Reportes y Analítica
El administrador tendrá acceso a un tablero de control con los siguientes informes:
Reporte Mensual de Órdenes: Resumen de todas las compras del mes.
Análisis de Fluctuación de Precios: Comparativa histórica de costos por producto y su impacto directo en el Precio Pieza.
Costo Semanal: Inversión total realizada tras el inventario del jueves.
Movimientos de Inventario: Trazabilidad completa (Padre-Hijo) de qué se pidió, qué se recibió y qué variaciones hubo.
5. Especificaciones Técnicas (Antigravity)
Sincronización: La app deberá leer y escribir en tiempo real en Google Sheets.
Interfaz: Diseño responsivo (Web Moderna) con filtros por área (Front, Cooler, Freezer, etc.).
Persistencia: El historial de precios no se sobrescribe; se genera una nueva fila en la bitácora cada vez que el área de compras modifica un valor.
Aprobación de Requerimientos:
Este documento sirve como base para el desarrollo del script de Google Apps Script y la configuración de vistas en Antigravity. Cualquier cambio en la lógica de las fórmulas de Status o En Stock deberá ser notificado para ajuste del DER.
