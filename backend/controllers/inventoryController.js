const { sheets, SHEET_ID } = require('../db');

const CATALOG_TABS = ['Drivers List', 'Kitchen List', 'Holiday'];

const getCatalog = async (req, res) => {
  try {
    // IMPORTANTE: agregar comillas simples para soportar espacios en los nombres de las hojas!
    const ranges = CATALOG_TABS.map(tab => `'${tab}'!A1:Z`);
    
    const response = await sheets.spreadsheets.values.batchGet({
      spreadsheetId: SHEET_ID,
      ranges: ranges
    });

    const catalog = {};
    response.data.valueRanges.forEach((vr, index) => {
      catalog[CATALOG_TABS[index]] = vr.values || [];
    });

    res.status(200).json({ message: 'Catálogo obtenido con éxito', data: catalog });
  } catch (error) {
    console.error('Error obteniendo inventario:', error.message);
    res.status(500).json({ message: 'Error recuperando los productos de Sheets' });
  }
};

const submitInventory = async (req, res) => {
  const { inventoryData, type, orderId } = req.body;
  
  if (!inventoryData || !inventoryData.length) {
    return res.status(400).json({ message: 'No hay datos para guardar' });
  }

  try {
    const timestamp = new Date().toISOString();
    
    const dateObj = new Date();
    const dd = String(dateObj.getDate()).padStart(2, '0');
    const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
    const yyyy = dateObj.getFullYear();
    const dateStr = `${dd}${mm}${yyyy}`;
    const prefix = type === 'EXTRAORDINARIO' ? 'Ext' : 'Sem';

    const sheetMeta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
    const hasOrders = sheetMeta.data.sheets.some(s => s.properties.title === 'ORDENES_COMPRA_HISTORICO');
    
    let maxConsecutive = 0;
    let todayExistingOrderId = null;

    if (hasOrders) {
      const resp = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: "'ORDENES_COMPRA_HISTORICO'!A:A"
      });
      const ids = resp.data.values || [];
      const regexYear = new RegExp(`^${prefix}-\\d{4}${yyyy}-(\\d{3})$`);
      const regexToday = new RegExp(`^${prefix}-${dateStr}-(\\d{3})$`);
      
      ids.forEach(row => {
         const idStr = row[0] || '';
         const matchYear = idStr.match(regexYear);
         if (matchYear) {
            const cons = parseInt(matchYear[1], 10);
            if (cons > maxConsecutive) maxConsecutive = cons;
         }
         
         if (type === 'SEMANAL' && idStr.match(regexToday)) {
            todayExistingOrderId = idStr;
         }
      });
    }

    let finalOrderId;
    if (type === 'SEMANAL' && todayExistingOrderId) {
      finalOrderId = todayExistingOrderId;
    } else {
      const nextConsStr = String(maxConsecutive + 1).padStart(3, '0');
      finalOrderId = `${prefix}-${dateStr}-${nextConsStr}`;
    }
    
    const username = req.user ? req.user.username : 'Sistema';
    
    const movData = [];
    const ordData = [];

    for (const item of inventoryData) {
      movData.push([
        finalOrderId, // A: ID_Pedido
        timestamp,    // B: Fecha
        username,     // C: Usuario
        type === 'EXTRAORDINARIO' ? 'EXTRAORDINARIA' : 'CICLO JUEVES', // D: Tipo
        item.idProducto, // E
        item.nombreProducto, // F
        item.area, // G
        item.stockFisico || 0, // H: Min Stock
        item.requerimiento || 0, // I: Cantidad Pedida
        0, // J: Cantidad Recibida
        item.cantidadDentro || 1, // K: Cantidad Dentro
        `=(INDIRECT("K"&ROW()) * (INDIRECT("H"&ROW()) + INDIRECT("J"&ROW())))`, // L: En Stock -> (Cantidad Dentro * (Min Stock + Recibida))
        `=IF(INDIRECT("I"&ROW())>0, (INDIRECT("L"&ROW()) / (INDIRECT("I"&ROW()) * INDIRECT("K"&ROW()))) - 1, 0)`, // M: % Sobre Stock
        item.precioUnitario || 0, // N: Precio Base
        `=INDIRECT("N"&ROW()) * (INDIRECT("H"&ROW()) + INDIRECT("J"&ROW()))` // O: Valor Inventario -> (Precio Base * (Min + Recibida))
      ]);

      if (item.orden > 0) {
         ordData.push([
           finalOrderId,
           timestamp,
           username,
           item.proveedor,
           item.idProv || '-',
           item.idProducto,
           item.nombreProducto,
           item.area,
           item.orden,
           item.precioUnitario || 0,
           (item.precioUnitario || 0) * item.orden
         ]);
      }
    }

    // 1. Guardar siempre en movimientos
    if (movData.length > 0) {
      const sheetMeta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
      let hasMovs = sheetMeta.data.sheets.some(s => s.properties.title === 'MOVIMIENTOS_INVENTARIO');
      if (!hasMovs) {
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId: SHEET_ID,
          requestBody: { requests: [{ addSheet: { properties: { title: 'MOVIMIENTOS_INVENTARIO' } } }] }
        });
        await sheets.spreadsheets.values.update({
          spreadsheetId: SHEET_ID, range: "'MOVIMIENTOS_INVENTARIO'!A1:O1", valueInputOption: 'USER_ENTERED',
          requestBody: { values: [['ID_Pedido', 'Fecha', 'Usuario', 'Tipo', 'ID_Producto', 'Producto', 'Área', 'Min Stock', 'Cantidad Pedida', 'Cantidad Recibida', 'Cantidad Dentro', 'En Stock', '% Sobre Stock', 'Precio Base', 'Valor del Inventario']] }
        });
      }

      await sheets.spreadsheets.values.append({
        spreadsheetId: SHEET_ID,
        range: "'MOVIMIENTOS_INVENTARIO'!A:O",
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: movData }
      });
    }

    // 2. Si se generaron órdenes, guardar en ORDENES_COMPRA_HISTORICO
    if (ordData.length > 0) {
      const sheetMeta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
      const sheetExists = sheetMeta.data.sheets.some(s => s.properties.title === 'ORDENES_COMPRA_HISTORICO');
      
      if (!sheetExists) {
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId: SHEET_ID,
          requestBody: { requests: [{ addSheet: { properties: { title: 'ORDENES_COMPRA_HISTORICO' } } }] }
        });
        await sheets.spreadsheets.values.update({
          spreadsheetId: SHEET_ID,
          range: "'ORDENES_COMPRA_HISTORICO'!A1:K1",
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: [['ID_Pedido', 'Fecha', 'Usuario', 'Proveedor', 'Id_Prod_Prov', 'ID_Producto', 'Producto', 'Área', 'Orden', 'Precio', 'Costo']] }
        });
      }

      await sheets.spreadsheets.values.append({
        spreadsheetId: SHEET_ID,
        range: "'ORDENES_COMPRA_HISTORICO'!A:K",
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: ordData }
      });
    }

    res.status(200).json({ message: `¡Inventario capturado! Se generó el pedido ${ordData.length > 0 ? orderId : '(Sin requerimientos)'}` });
  } catch (error) {
    console.error('Error insertando data:', error.message);
    res.status(500).json({ message: 'Fallo al guardar captura' });
  }
};

module.exports = { getCatalog, submitInventory };
