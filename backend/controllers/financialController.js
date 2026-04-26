const { sheets, SHEET_ID } = require('../db');

// Función auxiliar para obtener datos de una hoja de manera segura
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
    
    // Convertir array 2D a array de objetos usando la primera fila como keys
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

const freezePrices = async (req, res) => {
  try {
    res.status(200).json({ message: 'Precios congelados exitosamente en bitácora (Placeholder)' });
  } catch (error) {
    res.status(500).json({ message: 'Fallo al realizar el snapshot de precios' });
  }
};

const getMonthlyOrders = async (req, res) => {
  try {
    const data = await getSheetData('ORDENES_COMPRA_HISTORICO');
    res.status(200).json({ data });
  } catch (error) {
    res.status(500).json({ message: 'Error obteniendo órdenes mensuales' });
  }
};

const getPriceFluctuation = async (req, res) => {
  try {
    const data = await getSheetData('Bitacora_Precios');
    res.status(200).json({ data });
  } catch (error) {
    res.status(500).json({ message: 'Error obteniendo fluctuación de precios' });
  }
};

const getWeeklyCost = async (req, res) => {
  try {
    const data = await getSheetData('RECEPCIONES_HISTORICO');
    res.status(200).json({ data });
  } catch (error) {
    res.status(500).json({ message: 'Error calculando costo semanal' });
  }
};

const getInventoryMovements = async (req, res) => {
  try {
    const data = await getSheetData('MOVIMIENTOS_INVENTARIO');
    res.status(200).json({ data });
  } catch (error) {
    res.status(500).json({ message: 'Error obteniendo movimientos de inventario' });
  }
};

module.exports = { 
  freezePrices, 
  getMonthlyOrders, 
  getPriceFluctuation, 
  getWeeklyCost, 
  getInventoryMovements 
};
