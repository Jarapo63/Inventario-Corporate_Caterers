const { sheets, SHEET_ID } = require('../db');

const getRowIndices = async () => {
    const CATALOG_TABS = ['Drivers List', 'Kitchen List', 'Holiday', 'Special Request'];
    const ranges = CATALOG_TABS.map(tab => `'${tab}'!A:Z`);
    const res = await sheets.spreadsheets.values.batchGet({ spreadsheetId: SHEET_ID, ranges });
    const productLocations = {};
    res.data.valueRanges.forEach((vr, index) => {
        const rows = vr.values || [];
        rows.forEach((row, rIdx) => {
            if (row[0]) {
                productLocations[row[0]] = {
                    sheetName: CATALOG_TABS[index],
                    rowNum: rIdx + 1,
                    cantidadDentro: parseFloat(row[4]) || 1,
                    minStock: parseFloat(row[7]) || 0,
                    precio: parseFloat(String(row[8] || '0').replace(/[^0-9.-]+/g, '')) || 0
                };
            }
        });
    });
    return productLocations;
};

const submitReception = async (req, res) => {
  const { receptionData } = req.body;
  
  if (!receptionData || receptionData.length === 0) {
    return res.status(400).json({ message: 'No hay datos físicos de recepción.' });
  }

  try {
    const timestamp = new Date().toISOString();
    const batchData = [];
    const historyData = [];
    const movData = [];

    // Verificamos y pre-creamos pestaña histórica si no existe
    const sheetMeta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
    const sheetExists = sheetMeta.data.sheets.some(s => s.properties.title === 'RECEPCIONES_HISTORICO');
    
    if (!sheetExists) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SHEET_ID,
        requestBody: { requests: [{ addSheet: { properties: { title: 'RECEPCIONES_HISTORICO' } } }] }
      });
      await sheets.spreadsheets.values.update({
        spreadsheetId: SHEET_ID,
        range: "'RECEPCIONES_HISTORICO'!A1:H1",
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [['ID_Pedido', 'Fecha', 'Usuario', 'ID_Producto', 'Producto', 'Orden', 'Recibido', 'Status_Recepción']] }
      });
    }

    const productLocs = await getRowIndices();

    for (const item of receptionData) {
      const { orderId, idProducto, nombreProducto, orden, recibido } = item;
      const ordenNum = parseFloat(orden) || 0;
      const recibidoNum = parseFloat(recibido) || 0;
      
      let status = '';
      if (ordenNum === 0) status = 'Sin orden';
      else if (recibidoNum === ordenNum) status = 'OK';
      else status = 'Revisar';

      const loc = productLocs[idProducto];

      historyData.push([orderId, timestamp, req.user ? req.user.username : 'Sistema', idProducto, nombreProducto, ordenNum, recibidoNum, status]);
      
      movData.push([
        orderId,                      // A: ID_Pedido
        timestamp,                    // B: Fecha
        req.user ? req.user.username : 'Sistema', // C: Usuario
        'RECEPCIÓN',                  // D: Tipo
        idProducto,                   // E: ID_Producto
        nombreProducto,               // F: Producto
        loc ? loc.sheetName : '-',    // G: Área
        loc ? loc.minStock : 0,       // H: Min Stock
        ordenNum,                     // I: Cantidad Pedida
        recibidoNum,                  // J: Cantidad Recibida
        loc ? loc.cantidadDentro : 1, // K: Cantidad Dentro
        `=(INDIRECT("K"&ROW()) * (INDIRECT("H"&ROW()) + INDIRECT("J"&ROW())))`, // L: En Stock -> (CantDentro * (Min + Recibida))
        `=IF(INDIRECT("I"&ROW())>0, (INDIRECT("L"&ROW()) / (INDIRECT("I"&ROW()) * INDIRECT("K"&ROW()))) - 1, 0)`, // M: % Sobre Stock
        loc ? loc.precio : 0,         // N: Precio Base
        `=INDIRECT("N"&ROW()) * (INDIRECT("H"&ROW()) + INDIRECT("J"&ROW()))` // O: Valor Inventario
      ]);
    }

    // 2. Volcar al Histórico Transaccional
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: "'RECEPCIONES_HISTORICO'!A:H",
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: historyData }
    });

    // 3. Volcar a Movimientos Inventario
    if (movData.length > 0) {
      await sheets.spreadsheets.values.append({
        spreadsheetId: SHEET_ID,
        range: "'MOVIMIENTOS_INVENTARIO'!A:O",
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: movData }
      });
    }

    res.status(200).json({ message: 'Ingreso físico reportado y asociado con éxito.' });

  } catch (error) {
    console.error('Error procesando la recepción:', error.message);
    res.status(500).json({ message: `API Error: ${error.message}` });
  }
};

const getReceptionAlerts = async (req, res) => {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: "'RECEPCIONES_HISTORICO'!A:H"
    });
    const rows = response.data.values || [];
    if (rows.length <= 1) return res.status(200).json([]);
    
    const headers = rows[0];
    const alerts = [];
    
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row[7] === 'Revisar') {
        alerts.push({
          orderId: row[0],
          date: row[1],
          user: row[2],
          productId: row[3],
          productName: row[4],
          ordered: parseFloat(row[5]) || 0,
          received: parseFloat(row[6]) || 0
        });
      }
    }
    
    // Devolvemos las últimas que se detectaron pendientes de revisión
    res.status(200).json(alerts.reverse());
  } catch (err) {
    console.error('Error fetching alerts:', err.message);
    res.status(500).json({ message: 'Error fetching reception alerts.' });
  }
};

const resolveReception = async (req, res) => {
  const { orderId, productId, newReceived } = req.body;
  if (!orderId || !productId || newReceived === undefined) {
    return res.status(400).json({ message: 'Faltan parámetros de resolución.' });
  }

  try {
    const qty = parseFloat(newReceived);
    if (qty <= 0) return res.status(400).json({ message: 'La cantidad debe ser mayor a 0.' });

    const histRes = await sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: "'RECEPCIONES_HISTORICO'!A:H" });
    const histRows = histRes.data.values || [];
    
    let targetRowIndex = -1;
    let targetRow = null;
    
    for (let i = 1; i < histRows.length; i++) {
        if (histRows[i][0] === orderId && histRows[i][3] === productId) {
            targetRowIndex = i;
            targetRow = histRows[i];
            break;
        }
    }

    if (targetRowIndex === -1) return res.status(404).json({ message: 'Recepción original no encontrada en el historial.' });

    const ordered = parseFloat(targetRow[5]) || 0;
    const previouslyReceived = parseFloat(targetRow[6]) || 0;
    const totalReceived = previouslyReceived + qty;
    const newStatus = totalReceived >= ordered ? 'OK' : 'Revisar';
    const rowNum = targetRowIndex + 1;

    // Actualizamos la fila original de Recepcion Historial para acumular (Update F,G) -> index 6, 7 (Recibido, Status)
    const updateRequests = [
      { range: `'RECEPCIONES_HISTORICO'!G${rowNum}`, values: [[totalReceived]] },
      { range: `'RECEPCIONES_HISTORICO'!H${rowNum}`, values: [[newStatus]] }
    ];

    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: { valueInputOption: 'USER_ENTERED', data: updateRequests }
    });

    // Anexamos el resabio resolutivo a la tabla MOVIMIENTOS INVENTARIO!
    const productLocs = await getRowIndices();
    const loc = productLocs[productId];
    const timestamp = new Date().toISOString();
    
    const movData = [[
      orderId, // A
      timestamp, // B
      req.user ? req.user.username : 'Sistema', // C
      'RESO. RECEPCIÓN', // D
      productId, // E
      targetRow[4], // F
      loc ? loc.sheetName : '-', // G
      loc ? loc.minStock : 0, // H
      parseFloat(targetRow[5]) || 0, // I: Cantidad Pedida Original
      qty, // J: Delta Recibido
      loc ? loc.cantidadDentro : 1, // K
      `=(INDIRECT("K"&ROW()) * (INDIRECT("H"&ROW()) + INDIRECT("J"&ROW())))`, // L
      `=IF(INDIRECT("I"&ROW())>0, (INDIRECT("L"&ROW()) / (INDIRECT("I"&ROW()) * INDIRECT("K"&ROW()))) - 1, 0)`, // M
      loc ? loc.precio : 0, // N
      `=INDIRECT("N"&ROW()) * (INDIRECT("H"&ROW()) + INDIRECT("J"&ROW()))` // O
    ]];

    await sheets.spreadsheets.values.append({
       spreadsheetId: SHEET_ID,
       range: "'MOVIMIENTOS_INVENTARIO'!A:O",
       valueInputOption: 'USER_ENTERED',
       requestBody: { values: movData }
    });

    res.status(200).json({ message: 'Discrepancia resuelta exitosamente.' });
  } catch (err) {
    console.error('Error resolve Reception:', err.message);
    res.status(500).json({ message: 'Error backend al resolver: ' + err.message });
  }
};
const cancelReception = async (req, res) => {
  const { orderId, productId } = req.body;
  if (!orderId || !productId) return res.status(400).json({ message: 'Faltan parámetros.' });

  try {
    const histRes = await sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: "'RECEPCIONES_HISTORICO'!A:H" });
    const histRows = histRes.data.values || [];
    
    let targetRowIndex = -1;
    let recRow = null;
    for (let i = 1; i < histRows.length; i++) {
        if (histRows[i][0] === orderId && histRows[i][3] === productId && histRows[i][7] === 'Revisar') {
            targetRowIndex = i;
            recRow = histRows[i];
            break;
        }
    }

    if (targetRowIndex === -1) return res.status(404).json({ message: 'Discrepancia no encontrada.' });

    const rowNum = targetRowIndex + 1;
    const received = parseFloat(recRow[6]) || 0;
    
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `'RECEPCIONES_HISTORICO'!H${rowNum}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [['Cancelado']] }
    });

    const ordRes = await sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: "'ORDENES_COMPRA_HISTORICO'!A:K" });
    const ordRows = ordRes.data.values || [];
    
    let ordRowIndex = -1;
    let ordRow = null;
    for (let i = 1; i < ordRows.length; i++) {
        if (ordRows[i][0] === orderId && ordRows[i][5] === productId) {
            ordRowIndex = i;
            ordRow = ordRows[i];
            break;
        }
    }

    if (ordRowIndex !== -1) {
       const oRow = ordRowIndex + 1;
       const precioUnitario = parseFloat(String(ordRow[9]).replace(/[^0-9.-]+/g, '')) || 0;
       const newCosto = received * precioUnitario;
       
       await sheets.spreadsheets.values.batchUpdate({
          spreadsheetId: SHEET_ID,
          requestBody: {
            valueInputOption: 'USER_ENTERED',
            data: [
               { range: `'ORDENES_COMPRA_HISTORICO'!I${oRow}`, values: [[received]] },
               { range: `'ORDENES_COMPRA_HISTORICO'!K${oRow}`, values: [[newCosto]] }
            ]
          }
       });
    }

    res.status(200).json({ message: 'Mercancía cancelada exitosamente y costos ajustados.' });
  } catch (err) {
    console.error('Error cancel Reception:', err.message);
    res.status(500).json({ message: 'Error backend al cancelar: ' + err.message });
  }
};

const getCancelledReceptionReports = async (req, res) => {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: "'RECEPCIONES_HISTORICO'!A:H"
    });
    const rows = response.data.values || [];
    if (rows.length <= 1) return res.status(200).json([]);
    
    const cancelled = [];
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row[7] === 'Cancelado') {
        cancelled.push({
          orderId: row[0],
          date: row[1],
          user: row[2],
          productId: row[3],
          productName: row[4],
          ordered: parseFloat(row[5]) || 0,
          received: parseFloat(row[6]) || 0
        });
      }
    }
    res.status(200).json(cancelled.reverse());
  } catch (err) {
    console.error('Error fetching cancelled alerts:', err.message);
    res.status(500).json({ message: 'Error fetching cancelled alerts.' });
  }
};

const markCancelledAsOrdered = async (req, res) => {
  const { orderId, productId } = req.body;
  if (!orderId || !productId) return res.status(400).json({ message: 'Faltan parámetros.' });

  try {
    const histRes = await sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: "'RECEPCIONES_HISTORICO'!A:H" });
    const histRows = histRes.data.values || [];
    
    let targetRowIndex = -1;
    let targetRow = null;
    for (let i = 1; i < histRows.length; i++) {
        if (histRows[i][0] === orderId && histRows[i][3] === productId && histRows[i][7] === 'Cancelado') {
            targetRowIndex = i;
            targetRow = histRows[i];
            break;
        }
    }

    if (targetRowIndex === -1) return res.status(404).json({ message: 'No se encontró la recepción cancelada.' });

    const rowNum = targetRowIndex + 1;
    
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `'RECEPCIONES_HISTORICO'!H${rowNum}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [['Cancelado-RePedido']] }
    });

    // Calcular el faltante e inyectarlo en ORDENES_COMPRA_HISTORICO
    const ordered = parseFloat(targetRow[5]) || 0;
    const received = parseFloat(targetRow[6]) || 0;
    const faltante = ordered - received;

    if (faltante > 0) {
       const productLocs = await getRowIndices();
       const loc = productLocs[productId];
       const dateObj = new Date();
       const dd = String(dateObj.getDate()).padStart(2, '0');
       const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
       const yyyy = dateObj.getFullYear();
       const dateStr = `${dd}${mm}${yyyy}`;
       const timestamp = dateObj.toISOString();
       const username = req.user ? req.user.username : 'Sistema';
       
       const sheetMeta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
       const hasOrders = sheetMeta.data.sheets.some(s => s.properties.title === 'ORDENES_COMPRA_HISTORICO');
       
       let maxConsecutive = 0;
       if (hasOrders) {
         const resp = await sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: "'ORDENES_COMPRA_HISTORICO'!A:A" });
         const ids = resp.data.values || [];
         const regex = new RegExp(`^Ext-\\d{4}${yyyy}-(\\d{3})$`);
         ids.forEach(r => {
            const idStr = r[0] || '';
            const match = idStr.match(regex);
            if (match) {
               const cons = parseInt(match[1], 10);
               if (cons > maxConsecutive) maxConsecutive = cons;
            }
         });
       }
       const nextConsStr = String(maxConsecutive + 1).padStart(3, '0');
       const finalOrderId = `Ext-${dateStr}-${nextConsStr}`;
       
       const ordData = [[
           finalOrderId,
           timestamp,
           username,
           'Recuperado Extraordinario', 
           '-',                         
           productId,
           targetRow[4],                
           loc ? loc.sheetName : '-',   
           faltante,
           loc ? loc.precio : 0,
           (loc ? loc.precio : 0) * faltante,
           'TRUE' // L: Capturado por defecto
       ]];
       
       if (!hasOrders) {
         await sheets.spreadsheets.batchUpdate({
           spreadsheetId: SHEET_ID,
           requestBody: { requests: [{ addSheet: { properties: { title: 'ORDENES_COMPRA_HISTORICO' } } }] }
         });
         await sheets.spreadsheets.values.update({
           spreadsheetId: SHEET_ID,
           range: "'ORDENES_COMPRA_HISTORICO'!A1:L1",
           valueInputOption: 'USER_ENTERED',
           requestBody: { values: [['ID_Pedido', 'Fecha', 'Usuario', 'Proveedor', 'Id_Prod_Prov', 'ID_Producto', 'Producto', 'Área', 'Orden', 'Precio', 'Costo', 'Capturado']] }
         });
       }

       await sheets.spreadsheets.values.append({
         spreadsheetId: SHEET_ID,
         range: "'ORDENES_COMPRA_HISTORICO'!A:L",
         valueInputOption: 'USER_ENTERED',
         requestBody: { values: ordData }
       });
    }

    res.status(200).json({ message: 'Mercancía marcada como Re-Pedida exitosamente y orden extraordinaria generada.' });
  } catch (err) {
    console.error('Error marking as ordered:', err.message);
    res.status(500).json({ message: 'Error backend al re-pedir: ' + err.message });
  }
};

const dropCancelledOrder = async (req, res) => {
  const { orderId, productId } = req.body;
  if (!orderId || !productId) return res.status(400).json({ message: 'Faltan parámetros.' });

  try {
    const histRes = await sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: "'RECEPCIONES_HISTORICO'!A:H" });
    const histRows = histRes.data.values || [];
    let targetRowIndex = -1;

    for (let i = 1; i < histRows.length; i++) {
        if (histRows[i][0] === orderId && histRows[i][3] === productId && histRows[i][7] === 'Cancelado') {
            targetRowIndex = i;
            break;
        }
    }

    if (targetRowIndex === -1) return res.status(404).json({ message: 'No se encontró la recepción cancelada.' });

    const rowNum = targetRowIndex + 1;
    
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `'RECEPCIONES_HISTORICO'!H${rowNum}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [['Cancelado-Definitivo']] }
    });

    res.status(200).json({ message: 'Pedido extraordinario cancelado definitivamente.' });
  } catch (err) {
    console.error('Error dropping order:', err.message);
    res.status(500).json({ message: 'Error al cancelar definitivo: ' + err.message });
  }
};

module.exports = { submitReception, getReceptionAlerts, resolveReception, cancelReception, getCancelledReceptionReports, markCancelledAsOrdered, dropCancelledOrder };
