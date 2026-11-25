/**
 * ============================================================================
 *  HABITAR · Rotela Báez — Leads del formulario → Google Sheets (aplicación web de Apps Script)
 * ============================================================================
 *  Pegar en: Google Sheets → Extensiones → Apps Script (reemplaza todo el código).
 *  Pasos completos: integrations/google-sheets/README.md
 *
 *  - Solo recibe datos de la función de Netlify submit-lead (el navegador nunca llama acá).
 *  - Rechaza cualquier request que no traiga en el cuerpo el secreto guardado en la propiedad de script
 *    SHEETS_SECRET (Configuración del proyecto → Propiedades de la secuencia de comandos).
 *  - Agrega una fila en la hoja "Leads" y crea los encabezados si la hoja está vacía.
 *  - Escribe por NOMBRE de columna: podés mover columnas o agregar columnas tuyas; solo no cambies el texto
 *    de los encabezados de HEADERS.
 *  - Si falta un encabezado de HEADERS, o llega un dato con un nombre de columna que la hoja todavía no
 *    tiene, lo agrega al final de la fila 1. No mueve ni borra columnas ni filas existentes.
 *  - No duplica: si ya hay una fila con el mismo event_id (reintento o reenvío), no agrega otra.
 *  - "Estado CRM" con lista desplegable (ESTADOS). La web escribe "Nuevo", "Sin terreno" o "Prueba"; el
 *    resto lo cambia el equipo a mano.
 *  - Anti-inyección de fórmulas: un texto que empieza con =, +, - o @ se guarda con un apóstrofo adelante.
 * ============================================================================
 */

var SHEET_NAME = "Leads";

/** Encabezados, en orden. Los mismos nombres que usa netlify/functions/submit-lead.mts → sheetRow(). */
var HEADERS = [
  "Fecha y hora",
  "Nombre",
  "WhatsApp",
  "Email",
  "Estado CRM",
  "Tipo de lead",
  "Lead caliente",
  "¿Qué quiere proyectar?",
  "¿Tiene lote?",
  "Provincia",
  "Partido",
  "Dentro de 150 km",
  "¿Dirección de obra?",
  "m²",
  "Etapas",
  "Precio que vio",
  "¿Cuándo arranca?",
  "¿Quién decide?",
  "Botón de origen",
  "Origen",
  "utm_source",
  "utm_medium",
  "Campaña (utm_campaign)",
  "Conjunto (utm_term)",
  "Anuncio (utm_content)",
  "campaign_id",
  "adset_id",
  "ad_id",
  "Ubicación (placement)",
  "fbclid",
  "URL de entrada",
  "Referrer",
  "Dispositivo",
  "Cookies aceptadas",
  "event_id",
  "Notas",
];

/** Opciones de la lista desplegable de "Estado CRM" (incluye "Prueba" y "Sin terreno"). */
var ESTADOS = ["Nuevo", "Contactado", "Videollamada agendada", "Cotizado", "Ganado", "Perdido", "Sin terreno", "Prueba"];

/**
 * PRIMER PASO. Va primera en el archivo para que el editor la elija sola en la lista de funciones.
 * Ejecutala UNA vez desde el editor (botón Ejecutar con "setup" elegido):
 *  1) crea la hoja "Leads" con los encabezados y la lista desplegable de "Estado CRM", y
 *  2) si todavía no existe, crea el secreto SHEETS_SECRET (aleatorio, 64 caracteres) y lo guarda en las
 *     propiedades del script. Lo muestra en el "Registro de ejecución" para copiarlo a Netlify.
 * Si la volvés a ejecutar, no cambia el secreto: solo lo vuelve a mostrar.
 */
function setup() {
  var sheet = getSheet_();
  ensureHeaders_(sheet, []);
  var props = PropertiesService.getScriptProperties();
  var secret = props.getProperty("SHEETS_SECRET");
  if (!secret) {
    secret = (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, "");
    props.setProperty("SHEETS_SECRET", secret);
  }
  console.log('Listo. Hoja "' + SHEET_NAME + '" creada.');
  console.log("Copiá este secreto y pegalo en Netlify como SHEETS_SECRET:");
  console.log(secret);
  return secret;
}

function doPost(e) {
  var body;
  try {
    body = JSON.parse((e && e.postData && e.postData.contents) || "{}");
  } catch (err) {
    return respond_({ ok: false, error: "invalid_json" });
  }

  var secret = PropertiesService.getScriptProperties().getProperty("SHEETS_SECRET");
  if (!secret || !body || body.secret !== secret) {
    return respond_({ ok: false, error: "unauthorized" });
  }
  var lead = body.lead;
  if (!lead || typeof lead !== "object") return respond_({ ok: false, error: "missing_lead" });

  var lock = LockService.getScriptLock();
  lock.waitLock(10000); // dos envíos al mismo tiempo no se pisan la fila
  try {
    var sheet = getSheet_();
    var headers = ensureHeaders_(sheet, Object.keys(lead));
    // Idempotencia: mismo event_id = mismo lead (reintento de la función o reenvío del navegador)
    var col = headers.indexOf("event_id") + 1;
    var id = lead.event_id ? String(lead.event_id) : "";
    if (id && col > 0 && sheet.getLastRow() > 1) {
      var found = sheet
        .getRange(2, col, sheet.getLastRow() - 1, 1)
        .createTextFinder(id)
        .matchEntireCell(true)
        .findNext();
      if (found) return respond_({ ok: true, duplicate: true });
    }
    var row = headers.map(function (h) {
      return safe_(lead[h]);
    });
    sheet.appendRow(row);
    return respond_({ ok: true });
  } catch (err) {
    return respond_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

/** Abrir la URL /exec en el navegador tiene que mostrar {"ok":true,...}: sirve para probar el despliegue. */
function doGet() {
  return respond_({ ok: true, service: "Leads HABITAR" });
}

/**
 * Agrega al final de la fila 1 los encabezados que falten: los de HEADERS y los nombres de columna que
 * traiga el lead (así un dato nuevo de la web nunca se pierde por falta de columna). Pone la lista
 * desplegable en "Estado CRM". Devuelve la fila 1.
 */
function ensureHeaders_(sheet, keys) {
  var lastCol = Math.max(sheet.getLastColumn(), 1);
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var missing = [];
  HEADERS.concat(keys || []).forEach(function (h) {
    if (h && headers.indexOf(h) === -1 && missing.indexOf(h) === -1) missing.push(h);
  });
  if (missing.length) {
    var start = headers.filter(String).length ? headers.length + 1 : 1;
    if (start === 1) headers = [];
    sheet.getRange(1, start, 1, missing.length).setValues([missing]).setFontWeight("bold");
    headers = headers.concat(missing);
  }
  ensureStatusList_(sheet, headers);
  return headers;
}

/** Lista desplegable en la columna "Estado CRM" (filas 2 en adelante). Acepta otros valores con aviso. */
function ensureStatusList_(sheet, headers) {
  var col = headers.indexOf("Estado CRM") + 1;
  if (col < 1) return;
  var range = sheet.getRange(2, col, Math.max(sheet.getMaxRows() - 1, 1), 1);
  var current = range.getDataValidation();
  if (current && current.getCriteriaValues && String(current.getCriteriaValues()[0]) === String(ESTADOS)) return;
  var rule = SpreadsheetApp.newDataValidation().requireValueInList(ESTADOS, true).setAllowInvalid(true).build();
  range.setDataValidation(rule);
}

function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight("bold");
  }
  return sheet;
}

/** Anti-inyección de fórmulas: si un texto empieza con =, +, - o @, se antepone un apóstrofo. */
function safe_(v) {
  if (v === undefined || v === null) return "";
  var s = String(v);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function respond_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
