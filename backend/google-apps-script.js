
/**
 * GOOGLE APPS SCRIPT - BACKEND CHECKVIATURA PRO v3.6
 * Sistema de Auditoria e Sincronização de Dados de Frota.
 */

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var action = data.action;

    if (action === "saveLog") {
      return saveInspectionLog(data);
    }
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ "result": "error", "message": error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  try {
    var action = e.parameter.action;
    if (action === "getLogs") {
      return fetchInspectionLogs();
    }
    return ContentService.createTextOutput(JSON.stringify({ "result": "error", "message": "Ação inválida" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify([]))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function saveInspectionLog(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Logs");
  
  var headers = [
    "ID", "Data", "Viatura", "Placa", "Periodicidade", 
    "KM", "Conferente", "Resumo Status", "Detalhes Itens JSON", 
    "Espelho Fiel JSON", "Observações", "Foto da Conferência"
  ];
  
  if (!sheet) {
    sheet = ss.insertSheet("Logs");
    sheet.getRange(1, 1, 1, headers.length).setValues([headers])
      .setFontWeight("bold")
      .setBackground("#f3f3f3");
    sheet.setFrozenRows(1);
  }

  var rowId = data.id || Utilities.getUuid();

  sheet.appendRow([
    rowId,
    data.date || "",
    data.prefix || "",
    data.plate || "",
    data.checklistType || "",
    data.km || 0,
    data.inspector || "NÃO IDENTIFICADO",
    data.itemsStatus || "",
    data.itemsDetail || "[]",
    data.fullData || "{}",
    data.generalObservation || "",
    data.screenshot || ""
  ]);

  return ContentService.createTextOutput(JSON.stringify({ "result": "success", "id": rowId }))
    .setMimeType(ContentService.MimeType.JSON);
}

function fetchInspectionLogs() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Logs");
  if (!sheet) return ContentService.createTextOutput(JSON.stringify([])).setMimeType(ContentService.MimeType.JSON);

  var dataRange = sheet.getDataRange();
  var data = dataRange.getValues();
  if (data.length <= 1) return ContentService.createTextOutput(JSON.stringify([])).setMimeType(ContentService.MimeType.JSON);
  
  var headers = data[0];
  var rows = data.slice(1);

  var logs = rows.map(function(row) {
    var obj = {};
    headers.forEach(function(header, i) {
      var key = "";
      var h = header.toString().trim().toUpperCase();
      
      // Mapeamento explícito e resiliente
      if (h === "ID") key = "id";
      else if (h === "DATA") key = "date";
      else if (h === "VIATURA" || h === "PREFIXO" || h === "PREFIX") key = "prefix";
      else if (h === "PLACA" || h === "PLATE") key = "plate";
      else if (h === "PERIODICIDADE" || h === "CICLO" || h === "TIPO") key = "checklistType";
      else if (h === "KM" || h === "QUILOMETRAGEM") key = "km";
      else if (h === "CONFERENTE" || h === "INSPETOR") key = "inspector";
      else if (h === "RESUMO STATUS" || h === "STATUS") key = "itemsStatus";
      else if (h === "DETALHES ITENS JSON" || h === "ITENS") key = "itemsDetail";
      else if (h === "ESPELHO FIEL JSON" || h === "DATA_COMPLETA") key = "fullData";
      else if (h === "OBSERVAÇÕES" || h === "OBS") key = "generalObservation";
      else if (h === "FOTO DA CONFERÊNCIA" || h === "SCREENSHOT" || h === "IMAGEM") key = "screenshot";
      else key = h.toLowerCase().replace(/ /g, "_");

      var val = row[i];
      obj[key] = (val !== null && val !== undefined) ? val : "";
    });
    return obj;
  });

  return ContentService.createTextOutput(JSON.stringify(logs.reverse().slice(0, 1000)))
    .setMimeType(ContentService.MimeType.JSON);
}
