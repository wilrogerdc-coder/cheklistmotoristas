
/**
 * GOOGLE APPS SCRIPT - BACKEND CHECKVIATURA PRO v4.1
 * Sistema de Auditoria, Sincronização de Dados e Gestão de Acessos.
 * IMPORTANTE: Configure o acesso como "Qualquer pessoa" (Anyone).
 */

function doPost(e) {
  var result = { "result": "error", "message": "Início do processamento" };
  try {
    var contents = e.postData.contents;
    if (!contents) {
      throw new Error("Corpo da requisição vazio");
    }
    
    var data = JSON.parse(contents);
    var action = data.action;

    if (action === "saveLog") {
      return saveInspectionLog(data);
    } else if (action === "saveUser") {
      return saveUser(data);
    } else if (action === "deleteUser") {
      return deleteUser(data);
    } else {
      result.message = "Ação desconhecida: " + action;
    }
  } catch (error) {
    result.message = "Erro no doPost: " + error.toString();
  }
  
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  try {
    var action = e.parameter.action;
    if (action === "getLogs") {
      return fetchInspectionLogs();
    }
    if (action === "getUsers") {
      return fetchUsers();
    }
    return ContentService.createTextOutput(JSON.stringify({ "result": "error", "message": "Ação GET inválida" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify([]))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function saveUser(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Users");
  
  if (!sheet) {
    sheet = ss.insertSheet("Users");
    sheet.appendRow(["Username", "Password", "CreatedAt"]);
    sheet.getRange(1, 1, 1, 3).setFontWeight("bold").setBackground("#f3f3f3");
    sheet.setFrozenRows(1);
  }

  var username = String(data.username || "").trim();
  var password = String(data.password || "").trim();

  if (!username || !password) {
    return ContentService.createTextOutput(JSON.stringify({ "result": "error", "message": "Dados incompletos" }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // Proteção Superusuário
  if (username.toUpperCase() === "CAVALIERI") {
    return ContentService.createTextOutput(JSON.stringify({ "result": "error", "message": "Mestre Inalterável" }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  var usersData = sheet.getDataRange().getValues();
  var rowIndex = -1;
  
  for (var i = 1; i < usersData.length; i++) {
    if (usersData[i][0].toString().toLowerCase() === username.toLowerCase()) {
      rowIndex = i + 1;
      break;
    }
  }

  if (rowIndex !== -1) {
    sheet.getRange(rowIndex, 2).setValue(password);
  } else {
    sheet.appendRow([username, password, new Date().toISOString()]);
  }

  return ContentService.createTextOutput(JSON.stringify({ "result": "success" }))
    .setMimeType(ContentService.MimeType.JSON);
}

function deleteUser(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Users");
  if (!sheet) return ContentService.createTextOutput(JSON.stringify({ "result": "error" })).setMimeType(ContentService.MimeType.JSON);

  var username = String(data.username || "").trim();
  if (username.toUpperCase() === "CAVALIERI") return ContentService.createTextOutput(JSON.stringify({ "result": "error" })).setMimeType(ContentService.MimeType.JSON);

  var usersData = sheet.getDataRange().getValues();
  for (var i = 1; i < usersData.length; i++) {
    if (usersData[i][0].toString().toLowerCase() === username.toLowerCase()) {
      sheet.deleteRow(i + 1);
      break;
    }
  }
  return ContentService.createTextOutput(JSON.stringify({ "result": "success" }))
    .setMimeType(ContentService.MimeType.JSON);
}

function fetchUsers() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Users");
  if (!sheet) return ContentService.createTextOutput(JSON.stringify([])).setMimeType(ContentService.MimeType.JSON);

  var data = sheet.getDataRange().getValues();
  var users = [];
  for (var i = 1; i < data.length; i++) {
    if (data[i][0]) {
      users.push({
        username: data[i][0],
        password: data[i][1],
        createdAt: data[i][2]
      });
    }
  }
  return ContentService.createTextOutput(JSON.stringify(users))
    .setMimeType(ContentService.MimeType.JSON);
}

function saveInspectionLog(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Logs") || ss.insertSheet("Logs");
  
  if (sheet.getLastRow() === 0) {
    var headers = ["ID", "Data", "Viatura", "Placa", "Periodicidade", "KM", "Conferente", "Resumo Status", "Detalhes Itens JSON", "Espelho Fiel JSON", "Observações", "Foto da Conferência"];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight("bold").setBackground("#f3f3f3");
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
      var h = header.toString().trim();
      var key = "";
      
      // Mapeamento Estrito para evitar erros de case-sensitivity no Frontend
      if (h === "ID") key = "id";
      else if (h === "Data") key = "date";
      else if (h === "Viatura") key = "prefix";
      else if (h === "Placa") key = "plate";
      else if (h === "Periodicidade") key = "checklistType";
      else if (h === "KM") key = "km";
      else if (h === "Conferente") key = "inspector";
      else if (h === "Resumo Status") key = "itemsStatus";
      else if (h === "Detalhes Itens JSON") key = "itemsDetail";
      else if (h === "Espelho Fiel JSON") key = "fullData";
      else if (h === "Observações") key = "generalObservation";
      else if (h === "Foto da Conferência") key = "screenshot";
      else key = h.toLowerCase().replace(/\s+/g, '_');
      
      obj[key] = row[i];
    });
    return obj;
  });

  return ContentService.createTextOutput(JSON.stringify(logs.reverse().slice(0, 1000)))
    .setMimeType(ContentService.MimeType.JSON);
}
