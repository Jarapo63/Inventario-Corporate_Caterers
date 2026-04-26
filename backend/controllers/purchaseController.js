const { sheets, SHEET_ID } = require('../db');

const getSheetData = async (sheetName) => {
  try {
    const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
    const exists = meta.data.sheets.some(s => s.properties.title === sheetName);
    if (!exists) return [];

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `'${sheetName}'!A:Z`
    });

    const rows = response.data.values || [];
    if (rows.length === 0) return [];
    
    const headers = rows[0];
    return rows.slice(1).map(row => {
      let obj = {};
      headers.forEach((header, index) => {
        obj[header] = row[index] || '';
      });
      return obj;
    });
  } catch (error) {
    console.error(`Error leyendo hoja ${sheetName}:`, error);
    return [];
  }
};

const getPendingOrders = async (req, res) => {
  try {
    const allOrders = await getSheetData('ORDENES_COMPRA_HISTORICO');
    const receivedOrders = await getSheetData('RECEPCIONES_HISTORICO');
    
    // Crear un set de pedidos+productos ya procesados
    const receivedSet = new Set(receivedOrders.map(r => `${r.ID_Pedido}|${r.ID_Producto}`));
    
    const ordersMap = {};
    allOrders.forEach(item => {
      const id = item.ID_Pedido;
      const compKey = `${id}|${item.ID_Producto}`;
      
      if (!id || receivedSet.has(compKey) || item.Capturado !== 'TRUE') return; // Ocultar si ya fue recibido o no está capturado al proveedor
      
      if (!ordersMap[id]) {
        ordersMap[id] = { id: id, fecha: item.Fecha, usuario: item.Usuario, itemsCount: 0 };
      }
      if (parseFloat(item.Orden) > 0) {
        ordersMap[id].itemsCount += 1;
      }
    });

    const ordersList = Object.values(ordersMap)
      .filter(o => o.itemsCount > 0)
      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    res.status(200).json({ data: ordersList });
  } catch (error) {
    console.error('Error Obteniendo pedidos:', error);
    res.status(500).json({ message: 'Error procesando la lista de órdenes' });
  }
};

const getOrderDetails = async (req, res) => {
  try {
    const { orderId } = req.params;
    const allOrders = await getSheetData('ORDENES_COMPRA_HISTORICO');
    const receivedOrders = await getSheetData('RECEPCIONES_HISTORICO');
    
    const receivedIds = new Set(
      receivedOrders.filter(r => r.ID_Pedido === orderId).map(r => r.ID_Producto)
    );

    const orderItems = allOrders
      .filter(item => item.ID_Pedido === orderId)
      .filter(item => item.Capturado === 'TRUE')
      .filter(item => !receivedIds.has(item.ID_Producto));

    res.status(200).json({ data: orderItems });
  } catch (error) {
    console.error('Error Obteniendo detalles de pedido:', error);
    res.status(500).json({ message: 'Error obteniendo detalles del pedido' });
  }
};

const captureOrderProduct = async (req, res) => {
  try {
    const { orderId, productId, isCaptured } = req.body;
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `'ORDENES_COMPRA_HISTORICO'!A:Z`
    });
    
    const rows = response.data.values || [];
    if (rows.length === 0) return res.status(404).json({ message: 'Hoja histórico vacía' });
    
    // Asegurar encabezado
    if (rows[0].length < 12 || rows[0][11] !== 'Capturado') {
       await sheets.spreadsheets.values.update({
         spreadsheetId: SHEET_ID,
         range: `'ORDENES_COMPRA_HISTORICO'!L1`,
         valueInputOption: 'USER_ENTERED',
         requestBody: { values: [['Capturado']] }
       });
    }

    let targetRowIndex = -1;
    for (let i = 1; i < rows.length; i++) {
       if (rows[i][0] === orderId && rows[i][5] === productId) {
           targetRowIndex = i;
           break;
       }
    }

    if (targetRowIndex === -1) {
       return res.status(404).json({ message: 'Producto no encontrado' });
    }

    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `'ORDENES_COMPRA_HISTORICO'!L${targetRowIndex + 1}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [[isCaptured ? 'TRUE' : 'FALSE']] }
    });

    res.status(200).json({ message: 'Estado actualizado' });
  } catch (error) {
    console.error('Error actualizando check:', error);
    res.status(500).json({ message: 'Error interno en sheets' });
  }
};

const updateOrderQuantity = async (req, res) => {
  try {
    const { orderId, productId, newQuantity } = req.body;
    
    if (newQuantity < 0) {
      return res.status(400).json({ message: 'La cantidad no puede ser negativa' });
    }

    // 1. Actualizar ORDENES_COMPRA_HISTORICO
    const ordersRes = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `'ORDENES_COMPRA_HISTORICO'!A:Z`
    });
    const ordersRows = ordersRes.data.values || [];
    let orderTargetIndex = -1;
    let unitPrice = 0;

    for (let i = 1; i < ordersRows.length; i++) {
       if (ordersRows[i][0] === orderId && ordersRows[i][5] === productId) {
           orderTargetIndex = i;
           unitPrice = parseFloat(ordersRows[i][9] || '0'); // Col J: Precio
           break;
       }
    }

    if (orderTargetIndex !== -1) {
      const newCost = unitPrice * newQuantity;
      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: SHEET_ID,
        requestBody: {
          valueInputOption: 'USER_ENTERED',
          data: [
            { range: `'ORDENES_COMPRA_HISTORICO'!I${orderTargetIndex + 1}`, values: [[newQuantity]] },
            { range: `'ORDENES_COMPRA_HISTORICO'!K${orderTargetIndex + 1}`, values: [[newCost]] }
          ]
        }
      });
    }

    // 2. Actualizar MOVIMIENTOS_INVENTARIO
    const movsRes = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `'MOVIMIENTOS_INVENTARIO'!A:I`
    });
    const movsRows = movsRes.data.values || [];
    let movTargetIndex = -1;

    for (let i = 1; i < movsRows.length; i++) {
       if (movsRows[i][0] === orderId && movsRows[i][4] === productId) {
           movTargetIndex = i;
           break;
       }
    }

    if (movTargetIndex !== -1) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: SHEET_ID,
        range: `'MOVIMIENTOS_INVENTARIO'!I${movTargetIndex + 1}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [[newQuantity]] }
      });
    }

    if (orderTargetIndex === -1 && movTargetIndex === -1) {
       return res.status(404).json({ message: 'Producto/Pedido no encontrado en los registros' });
    }

    res.status(200).json({ message: 'Cantidad actualizada correctamente' });
  } catch (error) {
    console.error('Error actualizando cantidad de orden:', error);
    res.status(500).json({ message: 'Error interno en sheets al actualizar cantidad' });
  }
};

module.exports = { getPendingOrders, getOrderDetails, captureOrderProduct, updateOrderQuantity };
