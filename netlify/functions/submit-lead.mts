/**
 * Netlify Function — submit-lead  (POST /.netlify/functions/submit-lead)
 * ============================================================================
 * Único punto de entrada de los leads del formulario hacia Google Sheets y Meta. El navegador nunca habla
 * con Google ni con Meta.
 *
 *  a) Valida y sanitiza del lado del servidor con las MISMAS reglas que el navegador (form-steps.ts LIMITS,
 *     EMAIL_RE, parsePhone; lead.ts cleanAnswers / validAnswers). Un dato obligatorio inválido → 400 (el
 *     navegador no reintenta un 400) y el lead completo queda en el log ("LEAD NO GUARDADO").
 *     Se guarda todo envío con respuestas válidas: con lote = Lead; "Todavía no, lo estoy buscando" =
 *     "Sin terreno" (Estado CRM "Sin terreno" y a Meta va LeadSinTerreno en lugar de Lead).
 *     Los campos opcionales (atribución, URLs, cookies, botón, intención) NUNCA rechazan un lead: si vienen
 *     raros se descartan (ej. el referrer "android-app://…" de la app de Facebook/Instagram).
 *  b) Honeypot ("hr_k9"): si viene completo → responde OK, pero no guarda ni manda eventos.
 *  c) Escribe una fila en Google Sheets (Apps Script, integrations/google-sheets/Code.gs), con hasta
 *     SHEETS_ATTEMPTS intentos. El script no duplica filas con el mismo event_id (reintentos y reenvíos).
 *  d) Manda Lead (+ LeadCaliente) o LeadSinTerreno a la API de conversiones de Meta, con los mismos event_id
 *     que el Pixel del navegador para que Meta deduplique. Solo si hay Pixel (site.ts) y META_CAPI_TOKEN,
 *     la persona no rechazó las cookies y no es modo prueba.
 *  e) Responde { ok: true } si Sheets guardó; 502 si no (el navegador reintenta).
 *
 * Todo esto entra en ~8 s: Netlify corta la función a los 10 s.
 *
 * Modo prueba ("prueba": true, página abierta con ?modo=prueba): la fila va con Estado CRM "Prueba" y no se
 * manda nada a Meta.
 *
 * Variables de entorno (Netlify → Site configuration → Environment variables, README sección 5):
 *   SHEETS_WEBHOOK_URL   URL /exec de la aplicación web de Apps Script
 *   SHEETS_SECRET        mismo valor que la propiedad SHEETS_SECRET del script (va en el cuerpo, nunca en la URL)
 *   META_CAPI_TOKEN      token de la API de conversiones
 *   META_TEST_EVENT_CODE (opcional) solo para "Probar eventos"; borrarla al terminar
 *
 * Sin JS, el formulario hace POST normal (application/x-www-form-urlencoded): se procesa igual y se responde
 * con una redirección 303 (a WhatsApp con el resumen si hay número; si no, a la home).
 *
 * Diagnóstico: GET ?diagnostico=1 → variables, si Apps Script responde y si el secreto coincide (no escribe).
 *              GET ?diagnostico=1&prueba=1 → además escribe una fila "PRUEBA".
 */
import { createHash, randomUUID } from "node:crypto";
import { OPTIONS, LIMITS, EMAIL_RE, parsePhone, originLabel, countryOfCc, inRadius, etapaOf, PROV_BA } from "../../src/content/form-steps";
import { site, waLink } from "../../src/data/site";
import { cleanAnswers, validAnswers, qualifies, isHot, originOf, leadType, quoteText, summary, type FlowAnswers } from "../../src/scripts/lead";

/** Versión de la Graph API (la de la web de Víctor; actualizar acá cuando Meta publique una nueva). */
const GRAPH_API_VERSION = "v26.0";
const SHEETS_TIMEOUT_MS = 7000;
/** Presupuesto total para Sheets (el navegador corta cada intento a los ~10 s). */
const SHEETS_BUDGET_MS = 7500;
const SHEETS_ATTEMPTS = 2;
const META_TIMEOUT_MS = 5000;
const MAX_BODY_BYTES = 16_000;
const TIMEZONE = "America/Argentina/Buenos_Aires";

const ATTR_FIELDS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "campaign_id", "adset_id", "ad_id", "placement", "fbclid"] as const;
type AttrField = (typeof ATTR_FIELDS)[number];

interface Lead extends FlowAnswers {
  nombre: string;
  cc: string;
  phone: string;
  email: string;
  boton: string;
  attr: Record<AttrField, string>;
  landingUrl: string;
  referrer: string;
  fbclidTs: string;
  eventId: string;
  eventSourceUrl: string;
  consent: boolean;
  fbp: string;
  fbc: string;
  test: boolean;
}

class InvalidField extends Error {}

// ---------------------------------------------------------------------------
//  Utilidades
// ---------------------------------------------------------------------------
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, GET, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" };
const json = (body: object, status = 200) =>
  new Response(JSON.stringify(body, null, 2), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...CORS } });

/** Texto limpio: sin caracteres de control, sin espacios de más y con largo máximo. */
function text(v: unknown, max: number, field: string, { required = false, min = 0 } = {}): string {
  if (v === undefined || v === null) v = "";
  if (typeof v !== "string") throw new InvalidField(field);
  const s = v.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim();
  if (s.length > max) throw new InvalidField(field);
  if ((required || s) && s.length < Math.max(min, required ? 1 : 0)) throw new InvalidField(field);
  return s;
}
function choice(v: unknown, options: readonly string[], field: string): string {
  const s = text(v, 120, field, { required: true });
  if (!options.includes(s)) throw new InvalidField(field);
  return s;
}
function url(v: unknown, field: string): string {
  const s = text(v, 1000, field);
  if (!s) return "";
  try {
    const u = new URL(s);
    if (u.protocol !== "https:" && u.protocol !== "http:") throw 0;
    return u.href;
  } catch {
    throw new InvalidField(field);
  }
}
/** Campos opcionales: si vienen raros se descartan en lugar de rechazar el lead. */
function soft(f: () => string): string {
  try {
    return f();
  } catch (e) {
    if (e instanceof InvalidField) return "";
    throw e;
  }
}
const cut = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : v);

/** Anti-inyección de fórmulas en Sheets: si empieza con =, +, - o @ se antepone un apóstrofo. */
const cell = (v: string) => (/^[=+\-@]/.test(v) ? `'${v}` : v);
const sha256 = (v: string) => createHash("sha256").update(v).digest("hex");

function parseCookies(header: string | null): Record<string, string> {
  const out: Record<string, string> = {};
  (header || "").split(";").forEach((p) => {
    const i = p.indexOf("=");
    if (i > 0) {
      try {
        out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
      } catch {
        /* cookie mal codificada: se ignora */
      }
    }
  });
  return out;
}

/** "2026-11-25 14:30:05" en hora de Argentina. */
function nowArgentina(): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" })
      .formatToParts(new Date())
      .map((p) => [p.type, p.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;
}

// ---------------------------------------------------------------------------
//  a) Validación
// ---------------------------------------------------------------------------
function validate(b: Record<string, unknown>): Lead {
  // Obligatorias (si una no es una opción de la lista → 400). Las de intención, soft.
  const raw: FlowAnswers = {
    tipo: choice(b.tipo, OPTIONS.tipo, "tipo"),
    terreno: choice(b.terreno, OPTIONS.terreno, "terreno"),
    provincia: choice(b.provincia, OPTIONS.provincia, "provincia"),
    partido: b.provincia === PROV_BA ? choice(b.partido, OPTIONS.partido, "partido") : "",
    direccion: soft(() => text(cut(b.direccion, 120), 120, "direccion")),
    m2: choice(b.m2, OPTIONS.m2, "m2"),
    etapas: choice(b.etapas, OPTIONS.etapas, "etapas"),
    cuando: soft(() => text(cut(b.cuando, 120), 120, "cuando")),
    decide: soft(() => text(cut(b.decide, 120), 120, "decide")),
  };
  const a = cleanAnswers(raw);
  if (!validAnswers(a)) throw new InvalidField("respuestas");

  // Mismos mínimos que el formulario (LIMITS): si no, el Pixel contaría leads que nunca llegan a Sheets.
  const nombre = text(b.nombre, LIMITS.name.max, "nombre", { required: true, min: LIMITS.name.min });
  const email = text(b.email, LIMITS.email.max, "email", { required: true }).toLowerCase().replace(/\s/g, "");
  if (!EMAIL_RE.test(email)) throw new InvalidField("email");

  const selCc = text(b.pais_codigo, 4, "pais_codigo", { required: true });
  if (!/^(\d{1,4}|otro)$/.test(selCc)) throw new InvalidField("pais_codigo");
  const rawPhone = text(b.whatsapp_num, 24, "whatsapp_num", { required: true });
  if (!/^[\d\s().+-]+$/.test(rawPhone)) throw new InvalidField("whatsapp_num");
  const { cc, num: phone, ok: phoneOk } = parsePhone(rawPhone, selCc);
  if (!phoneOk) throw new InvalidField("whatsapp_num");

  // Opcionales: si vienen mal se descartan (nunca se pierde un lead por la atribución).
  const boton = originLabel(soft(() => text(b.modelo, 40, "modelo")));
  const attr = {} as Record<AttrField, string>;
  ATTR_FIELDS.forEach((k) => (attr[k] = soft(() => text(cut(b[k], 300), 300, k))));
  let fbclidTs = soft(() => text(b.fbclid_ts, 13, "fbclid_ts"));
  if (!/^\d{10,13}$/.test(fbclidTs)) fbclidTs = "";
  let eventId = soft(() => text(b.event_id, 36, "event_id"));
  // Sin event_id válido (envío sin JS): no hubo Pixel, solo servidor
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(eventId)) eventId = randomUUID();

  return {
    ...a,
    nombre,
    cc,
    phone,
    email,
    boton,
    attr,
    landingUrl: soft(() => url(cut(b.landing_url, 1000), "landing_url")),
    referrer: soft(() => url(cut(b.referrer, 1000), "referrer")),
    fbclidTs,
    eventId,
    eventSourceUrl: soft(() => url(cut(b.event_source_url, 1000), "event_source_url")),
    consent: b.consent !== false && b.consent !== "false",
    fbp: soft(() => text(b.fbp, 200, "fbp")),
    fbc: soft(() => text(b.fbc, 600, "fbc")),
    test: b.prueba === true || b.prueba === "true" || b.prueba === "1",
  };
}

// ---------------------------------------------------------------------------
//  c) Google Sheets (Apps Script)
// ---------------------------------------------------------------------------
/** Una fila, por nombre de columna (mismo texto que HEADERS en integrations/google-sheets/Code.gs). */
function sheetRow(l: Lead, device: string): Record<string, string> {
  const row: Record<string, string> = {
    "Fecha y hora": nowArgentina(),
    Nombre: l.nombre,
    // E.164 (+5491123456789); país fuera de la lista ("Otro país"): el número internacional completo
    WhatsApp: l.cc ? `+${l.cc}${l.phone}` : `+${l.phone}`,
    Email: l.email,
    "Estado CRM": l.test ? "Prueba" : qualifies(l) ? "Nuevo" : "Sin terreno",
    "Tipo de lead": leadType(l),
    "Lead caliente": isHot(l) ? "Sí" : "No",
    "¿Qué quiere proyectar?": l.tipo ?? "",
    "¿Tiene lote?": l.terreno ?? "",
    Provincia: l.provincia ?? "",
    Partido: l.partido ?? "",
    "Dentro de 150 km": inRadius(l) ? "Sí" : "No",
    "¿Dirección de obra?": l.direccion ?? "",
    "m²": l.m2 ?? "",
    Etapas: l.etapas ?? "",
    "Precio que vio": quoteText(l),
    "¿Cuándo arranca?": l.cuando ?? "",
    "¿Quién decide?": l.decide ?? "",
    "Botón de origen": l.boton,
    Origen: originOf(l.attr),
    utm_source: l.attr.utm_source,
    utm_medium: l.attr.utm_medium,
    "Campaña (utm_campaign)": l.attr.utm_campaign,
    "Conjunto (utm_term)": l.attr.utm_term,
    "Anuncio (utm_content)": l.attr.utm_content,
    campaign_id: l.attr.campaign_id,
    adset_id: l.attr.adset_id,
    ad_id: l.attr.ad_id,
    "Ubicación (placement)": l.attr.placement,
    fbclid: l.attr.fbclid,
    "URL de entrada": l.landingUrl,
    Referrer: l.referrer,
    Dispositivo: device,
    "Cookies aceptadas": l.consent ? "Sí" : "No",
    event_id: l.eventId,
  };
  for (const k in row) row[k] = cell(row[k]);
  return row;
}

async function sendSheets(row: Record<string, string>, timeout = SHEETS_TIMEOUT_MS) {
  const { SHEETS_WEBHOOK_URL, SHEETS_SECRET } = process.env;
  if (!SHEETS_WEBHOOK_URL || !SHEETS_SECRET) throw new Error("SHEETS_WEBHOOK_URL o SHEETS_SECRET sin configurar");
  const r = await fetch(SHEETS_WEBHOOK_URL.trim(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ secret: SHEETS_SECRET.trim(), lead: row }),
    redirect: "follow",
    signal: AbortSignal.timeout(timeout),
  });
  const out = (await r.json().catch(() => null)) as { ok?: boolean; error?: string; duplicate?: boolean } | null;
  if (!r.ok || !out?.ok) throw new Error(`Sheets respondió ${r.status}: ${out?.error ?? "sin JSON"}`);
  return out;
}

/** Hasta SHEETS_ATTEMPTS intentos dentro de SHEETS_BUDGET_MS (el script no duplica el mismo event_id). */
async function saveSheets(row: Record<string, string>) {
  const t0 = Date.now();
  let last: unknown;
  for (let i = 0; i < SHEETS_ATTEMPTS; i++) {
    const left = SHEETS_BUDGET_MS - (Date.now() - t0);
    if (left < 1500) break;
    try {
      return await sendSheets(row, Math.min(SHEETS_TIMEOUT_MS, left));
    } catch (e) {
      last = e;
      console.warn(`[submit-lead] Sheets intento ${i + 1} falló:`, String((e as Error)?.message ?? e));
      if (String((e as Error)?.message).includes("sin configurar")) break;
      await new Promise((r) => setTimeout(r, 300));
    }
  }
  throw last ?? new Error("sin tiempo para reintentar");
}

// ---------------------------------------------------------------------------
//  d) Meta — API de conversiones
// ---------------------------------------------------------------------------
/** ID del Pixel: site.ts (el mismo que usa el Pixel del navegador). META_PIXEL_ID solo para pruebas locales. */
const pixelOf = () => process.env.META_PIXEL_ID?.trim() || site.metaPixelId;
async function sendMeta(l: Lead, req: Request, ip: string) {
  const { META_CAPI_TOKEN, META_TEST_EVENT_CODE } = process.env;
  const pixelId = pixelOf();
  if (!pixelId) return "sin Pixel en site.ts (metaPixelId): no se manda a Meta";
  if (!META_CAPI_TOKEN) throw new Error("META_CAPI_TOKEN sin configurar");

  const cookies = parseCookies(req.headers.get("cookie"));
  const fbp = cookies._fbp || l.fbp;
  const fbc = cookies._fbc || l.fbc || (l.attr.fbclid ? `fb.1.${l.fbclidTs || Date.now()}.${l.attr.fbclid}` : "");
  // Nombre en un solo campo: la primera palabra es fn y el resto ln (hasheados por separado)
  const full = l.nombre.toLowerCase().replace(/\s+/g, " ").trim();
  const [first, ...rest] = full.split(" ");
  const last = rest.join(" ");
  // País por el código del WhatsApp (el lote puede estar en otro lado que donde vive la persona)
  const country = countryOfCc(l.cc);

  const user_data: Record<string, unknown> = {
    em: [sha256(l.email.trim().toLowerCase())],
    ph: [sha256(`${l.cc}${l.phone}`.replace(/\D/g, ""))],
    fn: [sha256(first)],
    ...(last ? { ln: [sha256(last)] } : {}),
    ...(country ? { country: [sha256(country)] } : {}),
    ...(ip ? { client_ip_address: ip } : {}),
    ...(req.headers.get("user-agent") ? { client_user_agent: req.headers.get("user-agent") } : {}),
    ...(fbp ? { fbp } : {}),
    ...(fbc ? { fbc } : {}),
  };
  const custom_data: Record<string, string> = {
    tipo_proyecto: l.tipo ?? "",
    tiene_lote: l.terreno ?? "",
    provincia: l.provincia ?? "",
    partido: l.partido ?? "",
    dentro_radio: inRadius(l) ? "si" : "no",
    m2: l.m2 ?? "",
    etapas: l.etapas ?? "",
    etapa_clave: etapaOf(l.etapas)?.key ?? "",
    precio_estimado: quoteText(l),
    cuando_arranca: l.cuando ?? "",
    quien_decide: l.decide ?? "",
    boton_origen: l.boton,
  };
  for (const k in custom_data) if (!custom_data[k]) delete custom_data[k];

  const base = {
    event_time: Math.floor(Date.now() / 1000),
    action_source: "website",
    event_source_url: l.eventSourceUrl || l.landingUrl || `${site.url}/`,
    user_data,
    custom_data,
  };
  // Mismo nombre y event_id que el Pixel del navegador → Meta deduplica.
  // Con lote: Lead (+ LeadCaliente si califica) · sin lote: solo LeadSinTerreno (no cuenta como lead).
  const data = [{ event_name: qualifies(l) ? "Lead" : "LeadSinTerreno", event_id: l.eventId, ...base }];
  if (isHot(l)) data.push({ event_name: "LeadCaliente", event_id: `${l.eventId}-hot`, ...base });

  // El token va en el cuerpo del POST (no en la URL, para que no quede en logs).
  // META_GRAPH_BASE solo para pruebas locales (por defecto, la Graph API de Meta).
  const r = await fetch(`${(process.env.META_GRAPH_BASE || "https://graph.facebook.com").replace(/\/$/, "")}/${GRAPH_API_VERSION}/${pixelId}/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data, access_token: META_CAPI_TOKEN, ...(META_TEST_EVENT_CODE ? { test_event_code: META_TEST_EVENT_CODE } : {}) }),
    signal: AbortSignal.timeout(META_TIMEOUT_MS),
  });
  if (!r.ok) {
    const err = (await r.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(`Meta respondió ${r.status}: ${err?.error?.message ?? "sin detalle"}`);
  }
  return `enviado: ${data.map((d) => d.event_name).join(" + ")}${META_TEST_EVENT_CODE ? " (Probar eventos)" : ""}`;
}

// ---------------------------------------------------------------------------
//  Diagnóstico (GET ?diagnostico=1): no escribe filas ni manda eventos (salvo &prueba=1: una fila PRUEBA)
// ---------------------------------------------------------------------------
async function diagnose(writeTestRow: boolean) {
  const { SHEETS_WEBHOOK_URL, SHEETS_SECRET, META_CAPI_TOKEN, META_TEST_EVENT_CODE } = process.env;
  const out: Record<string, unknown> = {
    funcion: "OK: la función submit-lead está publicada y responde",
    SHEETS_WEBHOOK_URL: SHEETS_WEBHOOK_URL ? "cargada" : "FALTA (Netlify → Environment variables, y después Trigger deploy)",
    SHEETS_SECRET: SHEETS_SECRET ? "cargada" : "FALTA (Netlify → Environment variables, y después Trigger deploy)",
    pixel: pixelOf() ? `OK: ${pixelOf()}` : "FALTA el ID del Pixel en src/data/site.ts (metaPixelId): sin él no se manda nada a Meta",
    META_CAPI_TOKEN: META_CAPI_TOKEN ? "cargada" : "FALTA",
    META_TEST_EVENT_CODE: META_TEST_EVENT_CODE ? "CARGADA: los eventos van a 'Probar eventos', borrala al terminar" : "no (bien)",
  };
  if (SHEETS_WEBHOOK_URL && !/^https:\/\/script\.google\.com\/(a\/macros\/[^/]+|macros)\/s\/[^/]+\/exec$/.test(SHEETS_WEBHOOK_URL.trim()))
    out.SHEETS_WEBHOOK_URL = "cargada, pero NO parece la URL de la aplicación web: tiene que ser https://script.google.com/macros/s/…/exec (sin espacios; no la del editor ni /dev)";
  if (SHEETS_WEBHOOK_URL && SHEETS_SECRET) {
    try {
      // Mismo POST que un lead real pero sin "lead": el script responde missing_lead si el secreto es correcto.
      const r = await fetch(SHEETS_WEBHOOK_URL.trim(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret: SHEETS_SECRET.trim() }),
        redirect: "follow",
        signal: AbortSignal.timeout(SHEETS_TIMEOUT_MS),
      });
      const raw = await r.text();
      let res: { ok?: boolean; error?: string } | null = null;
      try {
        res = JSON.parse(raw);
      } catch {
        /* HTML */
      }
      if (res?.error === "missing_lead") out.google_sheets = "OK: Apps Script responde y el secreto coincide";
      else if (res?.error === "unauthorized")
        out.google_sheets = "ERROR: el secreto no coincide. Copiá SHEETS_SECRET de Apps Script (⚙ Configuración del proyecto → Propiedades de la secuencia de comandos) a Netlify, sin espacios, y hacé Trigger deploy";
      else if (!res) out.google_sheets = `ERROR: Apps Script respondió ${r.status} con HTML, no JSON. Revisá la implementación: "Ejecutar como: Yo" y "Quién tiene acceso: Cualquier usuario"`;
      else out.google_sheets = `ERROR: Apps Script respondió ${JSON.stringify(res)}`;
    } catch (e) {
      out.google_sheets = `ERROR: no se pudo llamar a Apps Script (${String((e as Error)?.message ?? e)})`;
    }
    if (writeTestRow) {
      const row: Record<string, string> = { "Fecha y hora": nowArgentina(), Nombre: "PRUEBA", Notas: "Diagnóstico (borrar esta fila)", "Estado CRM": "Prueba", event_id: randomUUID() };
      try {
        await sendSheets(row);
        out.fila_de_prueba = "ESCRITA: buscá la fila 'PRUEBA' en la pestaña 'Leads' de la planilla donde pegaste el script";
      } catch (e) {
        out.fila_de_prueba = `ERROR: ${String((e as Error)?.message ?? e)}`;
      }
    }
  }
  return json(out);
}

// ---------------------------------------------------------------------------
//  Handler
// ---------------------------------------------------------------------------
export default async (req: Request, context: { ip?: string } = {}) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method === "GET") {
    const q = new URL(req.url).searchParams;
    if (q.has("diagnostico")) return diagnose(q.has("prueba"));
  }
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);

  const type = req.headers.get("content-type") || "";
  const isHtmlForm = type.includes("application/x-www-form-urlencoded");
  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) return json({ ok: false, error: "too_large" }, 413);

  let body: Record<string, unknown>;
  try {
    body = isHtmlForm ? Object.fromEntries(new URLSearchParams(raw)) : JSON.parse(raw);
    if (!body || typeof body !== "object" || Array.isArray(body)) throw 0;
  } catch {
    return json({ ok: false, error: "invalid_body" }, 400);
  }

  console.info("[submit-lead] Envío recibido de", req.headers.get("origin") || req.headers.get("referer") || "sin origen");

  // b) Honeypot: OK sin guardar ni mandar eventos
  const hp = (v: unknown) => v !== undefined && v !== null && String(v).trim() !== "";
  if (hp(body.hr_k9)) return isHtmlForm ? Response.redirect(`${site.url}/`, 303) : json({ ok: true });

  // a) Validación
  let lead: Lead;
  try {
    lead = validate(body);
  } catch (e) {
    if (e instanceof InvalidField) {
      console.error(`[submit-lead] LEAD NO GUARDADO (campo inválido: ${e.message}):`, raw);
      return isHtmlForm ? Response.redirect(`${site.url}/#cotiza`, 303) : json({ ok: false, error: "invalid_field", field: e.message }, 400);
    }
    throw e;
  }

  const ua = req.headers.get("user-agent") || "";
  const device = /Mobi|Android|iPhone|iPad|iPod/i.test(ua) ? "mobile" : "desktop";
  const ip = req.headers.get("x-nf-client-connection-ip") || context?.ip || (req.headers.get("x-forwarded-for") || "").split(",")[0].trim();

  // c) y d) en paralelo, con timeout. Nunca rompen la respuesta.
  const row = sheetRow(lead, device);
  const [sheets, meta] = await Promise.allSettled([
    saveSheets(row),
    lead.test ? Promise.resolve("modo prueba: no se manda a Meta") : lead.consent ? sendMeta(lead, req, ip) : Promise.resolve("rechazó las cookies: no se manda a Meta"),
  ]);
  if (sheets.status === "rejected") {
    console.error("[submit-lead] Sheets:", String(sheets.reason?.message ?? sheets.reason));
    console.error("[submit-lead] LEAD NO GUARDADO en Sheets, copialo a mano:", JSON.stringify(row));
  } else console.info(`[submit-lead] Lead ${sheets.value?.duplicate ? "ya estaba" : "guardado"} en Sheets:`, lead.nombre, lead.eventId, lead.test ? "(prueba)" : "");
  if (meta.status === "rejected") console.error("[submit-lead] Meta:", String(meta.reason?.message ?? meta.reason));
  else console.info("[submit-lead] Meta:", meta.value);

  // e) Respuesta
  if (isHtmlForm) {
    const wa = waLink(`Hola Hernán, soy ${lead.nombre}. Completé el formulario de la web.\n${summary(lead)}`);
    return Response.redirect(wa || `${site.url}/`, 303);
  }
  if (sheets.status === "rejected") return json({ ok: false, error: "sheets", event_id: lead.eventId }, 502);
  return json({ ok: true, event_id: lead.eventId });
};
