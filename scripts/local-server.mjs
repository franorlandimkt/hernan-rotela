/**
 * Servidor local para probar la web de punta a punta SIN cuentas (npm run local).
 *
 *   npm run build && npm run local              → http://localhost:8788 (funciones sin variables: como hoy en Netlify)
 *   npm run build && npm run local -- --mocks   → además simula Sheets, GHL y Meta (ver abajo)
 *
 * - Sirve dist/ (la web compilada) y corre las funciones REALES de netlify/functions/ (compiladas con esbuild)
 *   en /.netlify/functions/<nombre>, igual que Netlify.
 * - Con --mocks carga variables de entorno que apuntan a simuladores locales:
 *     /__mock/sheets        Apps Script: ejecuta el Code.gs REAL (integrations/google-sheets/Code.gs) sobre una
 *                           planilla en memoria (encabezados, sin duplicados, lista desplegable, anti-fórmulas).
 *     /__mock/ghl/...       API de GHL: campos personalizados, /contacts/upsert, free-slots, appointments.
 *     /__mock/ghl-webhook   webhook entrante del workflow.
 *     /__mock/graph/...     API de conversiones de Meta (guarda los eventos; no manda nada a Meta).
 *   GET /__mock/state → todo lo que recibieron los simuladores (filas, contactos, citas, eventos, webhooks).
 *   POST /__mock/reset → vacía el estado.
 *   --ghl-down → la API y el webhook de GHL responden 503 (para probar el respaldo de la agenda).
 * Nada de esto se publica: es solo para probar.
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { randomUUID } from "node:crypto";
import { pathToFileURL, fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = new Set(process.argv.slice(2));
const PORT = Number(process.env.PORT || 8788);
const MOCKS = args.has("--mocks");
const GHL_DOWN = args.has("--ghl-down");
const base = `http://localhost:${PORT}`;

if (MOCKS) {
  Object.assign(process.env, {
    SHEETS_WEBHOOK_URL: `${base}/__mock/sheets`,
    GHL_WEBHOOK_URL: `${base}/__mock/ghl-webhook`,
    GHL_API_TOKEN: "token-local",
    GHL_LOCATION_ID: "location-local",
    GHL_API_BASE: `${base}/__mock/ghl`,
    GHL_CALENDAR_ID: "calendario-local",
    META_CAPI_TOKEN: "token-local",
    META_PIXEL_ID: "000000000000000",
    META_TEST_EVENT_CODE: "TEST-LOCAL",
    META_GRAPH_BASE: `${base}/__mock/graph`,
  });
}

// ---------- funciones reales ----------
const outdir = path.join(root, ".local/functions");
const entries = fs.readdirSync(path.join(root, "netlify/functions")).filter((f) => f.endsWith(".mts"));
await build({ entryPoints: entries.map((f) => path.join(root, "netlify/functions", f)), bundle: true, platform: "node", format: "esm", outdir, outExtension: { ".js": ".mjs" }, logLevel: "warning" });
const fns = {};
for (const f of entries) fns[f.replace(/\.mts$/, "")] = (await import(pathToFileURL(path.join(outdir, f.replace(/\.mts$/, ".mjs"))).href)).default;

// ---------- estado de los simuladores ----------
const state = { sheet: [], capi: [], ghlContacts: {}, appointments: [], webhooks: [] };
const reset = () => {
  state.sheet = [];
  state.capi = [];
  state.ghlContacts = {};
  state.appointments = [];
  state.webhooks = [];
  appsScript = loadAppsScript();
};

// ---------- Apps Script: Code.gs real sobre una planilla en memoria ----------
function loadAppsScript() {
  const rows = state.sheet; // rows[0] = encabezados
  let validation = null;
  const props = {};
  const range = (r, c, nr = 1, nc = 1) => ({
    getValues: () => Array.from({ length: nr }, (_, i) => Array.from({ length: nc }, (_, j) => rows[r - 1 + i]?.[c - 1 + j] ?? "")),
    setValues: (vals) => {
      vals.forEach((row, i) => row.forEach((v, j) => ((rows[r - 1 + i] ??= [])[c - 1 + j] = v)));
      return range(r, c, nr, nc);
    },
    setFontWeight: () => range(r, c, nr, nc),
    getDataValidation: () => validation,
    setDataValidation: (v) => (validation = v),
    createTextFinder: (txt) => ({
      matchEntireCell: () => ({ findNext: () => (range(r, c, nr, nc).getValues().some((row) => row.some((v) => String(v) === String(txt))) ? {} : null) }),
    }),
  });
  const sheet = {
    getLastRow: () => rows.length,
    getLastColumn: () => Math.max(0, ...rows.map((r) => r.length)),
    getMaxRows: () => Math.max(1000, rows.length),
    getRange: range,
    appendRow: (row) => rows.push([...row]),
    setFrozenRows: () => {},
  };
  const ctx = vm.createContext({
    console,
    SpreadsheetApp: {
      getActiveSpreadsheet: () => ({ getSheetByName: () => sheet, insertSheet: () => sheet }),
      newDataValidation: () => {
        const v = { list: [] };
        const b = { requireValueInList: (l) => ((v.list = l), b), setAllowInvalid: () => b, build: () => ({ getCriteriaValues: () => [v.list] }) };
        return b;
      },
    },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => props[k] ?? null, setProperty: (k, v) => (props[k] = v) }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    ContentService: { createTextOutput: (s) => ({ s, setMimeType() { return this; } }), MimeType: { JSON: "json" } },
    Utilities: { getUuid: () => randomUUID() },
  });
  vm.runInContext(fs.readFileSync(path.join(root, "integrations/google-sheets/Code.gs"), "utf8"), ctx);
  const secret = ctx.setup();
  if (MOCKS) process.env.SHEETS_SECRET = secret;
  return { ctx, validation: () => validation };
}
let appsScript = loadAppsScript();

// ---------- GHL simulado ----------
const GHL_FIELDS = (() => {
  // Los campos personalizados que pide la web (los mismos que lista ghl-lead ?diagnostico=1) + hora_llamada_local
  const keys = "tipo_proyecto tiene_lote provincia partido dentro_radio direccion_obra m2 etapas precio_estimado cuando_arranca quien_decide califica lead_caliente tipo_lead utm_source utm_medium utm_campaign utm_content utm_term campaign_id adset_id ad_id placement fbclid origen boton_origen url_pagina url_entrada referrer dispositivo ubicacion_ip pais_whatsapp fecha fbp fbc consentimiento_whatsapp consentimiento_fecha_hora cookies_aceptadas event_id resumen test hora_llamada_local".split(" ");
  return keys.map((k, i) => ({ id: `f${i}`, name: k, fieldKey: `contact.${k}`, dataType: k === "resumen" ? "LARGE_TEXT" : "TEXT" }));
})();
function slotsFor(tz) {
  const out = {};
  const now = new Date();
  for (let d = 0; d < 4; d++) {
    const day = new Date(now.getTime() + d * 864e5);
    const ymd = day.toISOString().slice(0, 10);
    const list = [10, 15, 18].map((h) => `${ymd}T${String(h).padStart(2, "0")}:00:00-03:00`).filter((s) => Date.parse(s) > Date.now());
    if (list.length && d !== 1) out[ymd] = { slots: list }; // mañana sin horarios, para probar "Sin horarios"
  }
  return out;
}

// ---------- HTTP ----------
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".avif": "image/avif", ".woff2": "font/woff2", ".json": "application/json", ".txt": "text/plain; charset=utf-8", ".xml": "application/xml", ".webmanifest": "application/manifest+json", ".mp4": "video/mp4" };
const readBody = (req) => new Promise((ok) => {
  const chunks = [];
  req.on("data", (c) => chunks.push(c));
  req.on("end", () => ok(Buffer.concat(chunks)));
});
const send = (res, status, body, type = "application/json; charset=utf-8") => {
  res.writeHead(status, { "Content-Type": type, "Access-Control-Allow-Origin": "*" });
  res.end(typeof body === "string" || Buffer.isBuffer(body) ? body : JSON.stringify(body, null, 2));
};

async function mock(req, res, url, raw) {
  const p = url.pathname;
  const body = raw.length ? (() => { try { return JSON.parse(raw.toString()); } catch { return {}; } })() : {};
  if (p === "/__mock/state") return send(res, 200, { ...state, sheetValidation: appsScript.validation()?.getCriteriaValues()[0] ?? null });
  if (p === "/__mock/reset") return reset(), send(res, 200, { ok: true });
  if (p === "/__mock/sheets") return send(res, 200, appsScript.ctx.doPost({ postData: { contents: raw.toString() } }).s);
  if (p.startsWith("/__mock/graph/")) {
    if (body.access_token !== "token-local") return send(res, 400, { error: { message: "token inválido" } });
    state.capi.push({ test_event_code: body.test_event_code, data: body.data });
    return send(res, 200, { events_received: body.data?.length ?? 0 });
  }
  if (GHL_DOWN && (p.startsWith("/__mock/ghl"))) return send(res, 503, { error: "ghl caído (--ghl-down)" });
  if (p === "/__mock/ghl-webhook") return state.webhooks.push(body), send(res, 200, { ok: true });
  if (p.startsWith("/__mock/ghl/")) {
    if (req.headers.authorization !== "Bearer token-local") return send(res, 401, { message: "unauthorized" });
    if (/\/locations\/[^/]+\/customFields/.test(p)) return send(res, 200, { customFields: GHL_FIELDS });
    if (p.endsWith("/contacts/upsert")) {
      const key = body.email || body.phone;
      const prev = state.ghlContacts[key] ?? { id: `c-${Object.keys(state.ghlContacts).length + 1}`, customFields: {} };
      const fields = { ...prev.customFields };
      for (const f of body.customFields ?? []) fields[GHL_FIELDS.find((x) => x.id === f.id)?.name ?? f.id] = f.field_value;
      state.ghlContacts[key] = { ...prev, ...body, customFields: fields };
      return send(res, 200, { contact: { id: prev.id } });
    }
    if (/\/calendars\/[^/]+\/free-slots/.test(p)) return send(res, 200, slotsFor(url.searchParams.get("timezone")));
    if (p.endsWith("/calendars/events/appointments")) {
      if (state.appointments.some((a) => a.startTime === body.startTime)) return send(res, 409, { message: "slot no disponible" });
      state.appointments.push(body);
      return send(res, 201, { id: `a-${state.appointments.length}` });
    }
  }
  return send(res, 404, { error: "mock no encontrado", path: p });
}

http
  .createServer(async (req, res) => {
    const url = new URL(req.url, base);
    const raw = await readBody(req);
    try {
      if (url.pathname.startsWith("/__mock/")) return mock(req, res, url, raw);
      const fn = url.pathname.match(/^\/\.netlify\/functions\/([\w-]+)/)?.[1];
      if (fn) {
        if (!fns[fn]) return send(res, 404, { error: "función no encontrada" });
        const r = await fns[fn](new Request(url, { method: req.method, headers: req.headers, body: ["GET", "HEAD"].includes(req.method) ? undefined : raw }), { ip: "127.0.0.1", geo: { city: "Local", country: { code: "AR" } } });
        const headers = Object.fromEntries(r.headers);
        res.writeHead(r.status, headers);
        return res.end(Buffer.from(await r.arrayBuffer()));
      }
      // estáticos de dist/ (build.format: "file" → /llamada-agendada = llamada-agendada.html)
      let file = path.join(root, "dist", decodeURIComponent(url.pathname));
      if (url.pathname === "/") file = path.join(root, "dist/index.html");
      else if (!path.extname(file)) file += ".html";
      if (!file.startsWith(path.join(root, "dist")) || !fs.existsSync(file)) return send(res, 404, "404", "text/plain");
      return send(res, 200, fs.readFileSync(file), TYPES[path.extname(file)] ?? "application/octet-stream");
    } catch (e) {
      console.error(e);
      return send(res, 500, { error: String(e?.message ?? e) });
    }
  })
  .listen(PORT, () => console.log(`Local: ${base}  ${MOCKS ? "(con simuladores de Sheets, GHL y Meta" + (GHL_DOWN ? ", GHL caído" : "") + ")" : "(sin variables, como Netlify hoy)"}`));
