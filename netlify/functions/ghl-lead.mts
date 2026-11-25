/**
 * Netlify Function — ghl-lead  (POST /.netlify/functions/ghl-lead)
 * ============================================================================
 * Manda el lead del formulario a Go High Level (GHL), aparte de submit-lead: un error de GHL nunca frena el
 * envío a Sheets ni la pantalla final.
 *
 *  - El navegador manda acá el mismo cuerpo que a submit-lead (más ts) con fetch + keepalive y reintentos.
 *  - Valida nombre, email y WhatsApp con las mismas reglas que submit-lead; las respuestas que vengan mal
 *    se mandan vacías (nunca se pierde el lead por eso).
 *  - "califica" y "tipo_lead" se calculan acá con la misma regla del formulario (lead.ts): con lote =
 *    califica; "Todavía no, lo estoy buscando" = califica=false y tipo_lead "Sin terreno".
 *  - Modo prueba ("prueba": true, ?modo=prueba): se manda igual, con test=true.
 *  - Campos personalizados: el webhook solo NO los llena (lección de Víctor). Por eso, ANTES del webhook, la
 *    función crea o actualiza el contacto por la API (/contacts/upsert, el mismo contacto que la agenda) con
 *    cada dato en su campo personalizado: el campo de GHL cuya clave es contact.{clave del payload}
 *    (contact.tipo_proyecto…) o, si no hay, el que se llama igual. Cuando el workflow arranca, el contacto
 *    ya tiene todo. WhatsApp en E.164 (+5491123456789).
 *  - Todas las llamadas a GHL de un envío entran en 9 s (Netlify corta a los 10 s y el navegador reintentaría,
 *    disparando el webhook dos veces).
 *  - Responde { ok: true } si el webhook respondió 2xx; 502 si no (el navegador reintenta); 400 si un dato es
 *    inválido (no reintenta). Si GHL falla, el payload queda en el log ("[ghl-lead] NO LLEGÓ A GHL").
 *
 * Variables de entorno (README sección 5):
 *   GHL_WEBHOOK_URL   URL del webhook entrante del workflow de GHL
 *   GHL_API_TOKEN     token de la Private Integration (el mismo de ghl-booking; necesita View Custom Fields)
 *   GHL_LOCATION_ID   Location ID de la subcuenta
 *
 * Diagnóstico: GET ?diagnostico=1 → variables cargadas y qué dato va a qué campo personalizado de GHL (y
 * cuáles no tienen campo todavía).
 */
import { OPTIONS, LIMITS, EMAIL_RE, toE164, originLabel, inRadius, PROV_BA, countryOfCc, parsePhone } from "../../src/content/form-steps";
import { cleanAnswers, qualifies, isHot, originOf, leadType, quoteText, summary, type FlowAnswers } from "../../src/scripts/lead";

const GHL_TIMEOUT_MS = 8000;
/** Tiempo total para todas las llamadas a GHL de un envío. */
const TOTAL_BUDGET_MS = 9000;
/** Lo mínimo que se reserva para el webhook (lo único que no puede faltar). */
const WEBHOOK_MIN_MS = 3000;
/** Tipos de campo que aceptan cualquier texto (si GHL rechaza un valor, se reintenta solo con estos). */
const TEXT_TYPES = new Set(["TEXT", "LARGE_TEXT"]);
const MAX_BODY_BYTES = 16_000;
const TIMEZONE = "America/Argentina/Buenos_Aires";
const VERSION_CONTACTS = "2021-07-28";
/** Los campos personalizados se vuelven a leer cada tanto (si se crea uno nuevo, se usa solo). */
const FIELDS_TTL_MS = 10 * 60e3;
/** Datos que van a campos estándar del contacto (nombre, email, teléfono), no a campos personalizados. */
const STANDARD_KEYS = new Set(["nombre", "nombre_pila", "apellido", "email", "whatsapp"]);

class InvalidField extends Error {}
/** Error de la API de GHL. retry: vale la pena reintentar (red, tiempo, 429, 5xx). */
class GhlApiError extends Error {
  status = 0;
  constructor(
    msg: string,
    public retry: boolean,
  ) {
    super(msg);
  }
}

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, GET, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" };
const json = (body: object, status = 200) =>
  new Response(JSON.stringify(body, null, 2), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...CORS } });

/** Texto limpio: sin caracteres de control, sin espacios de más; si es más largo que max, se corta. */
const str = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim().slice(0, max) : "");
/** Respuesta de una pregunta: solo si es una opción válida (si no, va vacía). */
const pick = (v: unknown, options: readonly string[]) => {
  const s = str(v, 120);
  return options.includes(s) ? s : "";
};

/** Fecha (AAAA-MM-DD) y fecha y hora ISO en hora de Argentina (-03:00). */
function argentinaTime(ms: number) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23", timeZoneName: "longOffset" })
      .formatToParts(new Date(ms))
      .map((x) => [x.type, x.value]),
  );
  const offset = (p.timeZoneName || "GMT-03:00").replace("GMT", "") || "-03:00";
  const date = `${p.year}-${p.month}-${p.day}`;
  return { date, dateTime: `${date}T${p.hour}:${p.minute}:${p.second}${offset}` };
}

/** Datos del pedido que no vienen del formulario: dispositivo y ubicación aproximada por IP. */
interface RequestInfo {
  device: string;
  location: string;
}
/** Contexto de Netlify Functions: ubicación por IP (puede faltar en local). */
interface NetlifyContext {
  geo?: { city?: string; country?: { code?: string; name?: string }; subdivision?: { code?: string; name?: string } };
}

const httpUrl = (v: unknown) => {
  const s = str(v, 1000);
  return /^https?:\/\//.test(s) ? s : "";
};

/** Payload que llega a GHL (una clave por dato, en snake_case). */
function ghlPayload(b: Record<string, unknown>, info: RequestInfo) {
  const nombre = str(b.nombre, LIMITS.name.max);
  if (nombre.length < LIMITS.name.min) throw new InvalidField("nombre");
  const email = str(b.email, LIMITS.email.max).toLowerCase().replace(/\s/g, "");
  if (!EMAIL_RE.test(email)) throw new InvalidField("email");
  const rawPhone = str(b.whatsapp_num, 24);
  const selCc = str(b.pais_codigo, 4);
  if (!/^[\d\s().+-]+$/.test(rawPhone) || !/^(\d{1,4}|otro)$/.test(selCc)) throw new InvalidField("whatsapp_num");
  // E.164: +5491123456789 (Argentina, con el 9), +595981123456 (Paraguay), etc.
  const whatsapp = toE164(rawPhone, selCc);
  if (!whatsapp) throw new InvalidField("whatsapp_num");
  const cc = parsePhone(rawPhone, selCc).cc;

  const a: FlowAnswers = cleanAnswers({
    tipo: pick(b.tipo, OPTIONS.tipo),
    terreno: pick(b.terreno, OPTIONS.terreno),
    provincia: pick(b.provincia, OPTIONS.provincia),
    partido: pick(b.partido, OPTIONS.partido),
    direccion: pick(b.direccion, OPTIONS.direccion),
    m2: pick(b.m2, OPTIONS.m2),
    etapas: pick(b.etapas, OPTIONS.etapas),
    cuando: pick(b.cuando, OPTIONS.cuando),
    decide: pick(b.decide, OPTIONS.decide),
  });
  const attr = Object.fromEntries(["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "campaign_id", "adset_id", "ad_id", "placement", "fbclid"].map((k) => [k, str(b[k], 300)]));
  // Nombre en un solo campo: la primera palabra es el nombre de pila y el resto el apellido
  const [nombrePila, ...resto] = nombre.split(" ");
  const origen = originOf(attr);
  const boton = originLabel(str(b.modelo, 40));
  // Hora del envío según el navegador (ts); si no viene o es absurda (reloj mal), la del servidor
  const ts = Number(b.ts);
  const now = Date.now();
  const when = argentinaTime(Number.isFinite(ts) && ts > now - 90 * 864e5 && ts < now + 864e5 ? ts : now);
  const eventId = str(b.event_id, 36);
  const califica = qualifies(a);

  return {
    nombre,
    nombre_pila: nombrePila,
    apellido: resto.join(" "),
    email,
    whatsapp,
    tipo_proyecto: a.tipo ?? "",
    tiene_lote: a.terreno ?? "",
    provincia: a.provincia ?? "",
    partido: a.provincia === PROV_BA ? (a.partido ?? "") : "",
    dentro_radio: a.provincia ? inRadius(a) : false,
    direccion_obra: a.direccion ?? "",
    m2: a.m2 ?? "",
    etapas: a.etapas ?? "",
    precio_estimado: quoteText(a),
    cuando_arranca: a.cuando ?? "",
    quien_decide: a.decide ?? "",
    califica,
    lead_caliente: isHot(a),
    tipo_lead: leadType(a),
    utm_source: attr.utm_source,
    utm_medium: attr.utm_medium,
    utm_campaign: attr.utm_campaign,
    utm_content: attr.utm_content,
    utm_term: attr.utm_term,
    campaign_id: attr.campaign_id,
    adset_id: attr.adset_id,
    ad_id: attr.ad_id,
    placement: attr.placement,
    fbclid: attr.fbclid,
    origen,
    boton_origen: boton,
    url_pagina: httpUrl(b.event_source_url) || httpUrl(b.landing_url),
    url_entrada: httpUrl(b.landing_url),
    referrer: httpUrl(b.referrer),
    dispositivo: info.device,
    ubicacion_ip: info.location,
    pais_whatsapp: countryOfCc(cc).toUpperCase(),
    fecha: when.date,
    // Identificadores de Meta: cookie _fbp y cookie _fbc (o armada con el fbclid de entrada: fb.1.{ms}.{fbclid})
    fbp: /^fb\.\d\.\d+\.\d+$/.test(str(b.fbp, 200)) ? str(b.fbp, 200) : "",
    fbc: /^fb\.\d\.\d+\.\S+$/.test(str(b.fbc, 600)) ? str(b.fbc, 600) : "",
    // Aceptó "Al enviar, aceptás que te contactemos por WhatsApp" (debajo del botón de enviar)
    consentimiento_whatsapp: b.consentimiento_whatsapp === true || b.consentimiento_whatsapp === "true",
    consentimiento_fecha_hora: when.dateTime,
    // No tocó "Rechazar" en el banner de cookies
    cookies_aceptadas: b.consent !== false && b.consent !== "false",
    // Mismo event_id que la fila de Sheets y los eventos del Pixel y la API de conversiones
    event_id: /^[0-9a-f-]{36}$/i.test(eventId) ? eventId : "",
    resumen: summary(a, [
      ["Origen", origen],
      ["Botón", boton],
    ]),
    test: b.prueba === true || b.prueba === "true" || b.prueba === "1",
  };
}

type Payload = ReturnType<typeof ghlPayload>;

// ---------- API de GHL: contacto con sus campos personalizados ----------

function apiConfig() {
  const token = process.env.GHL_API_TOKEN?.trim();
  const locationId = process.env.GHL_LOCATION_ID?.trim();
  if (!token || !locationId) return null;
  // GHL_API_BASE solo para pruebas locales (por defecto, la API de GHL)
  return { token, locationId, base: (process.env.GHL_API_BASE || "https://services.leadconnectorhq.com").replace(/\/$/, "") };
}

/** ms que quedan hasta `deadline`, entre min y GHL_TIMEOUT_MS. */
const timeLeft = (deadline: number, min = 500) => Math.min(GHL_TIMEOUT_MS, Math.max(min, deadline - Date.now()));

async function ghlApi(path: string, init: RequestInit = {}, deadline = Date.now() + GHL_TIMEOUT_MS) {
  const cfg = apiConfig()!;
  let r: Response;
  try {
    r = await fetch(`${cfg.base}${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${cfg.token}`, Version: VERSION_CONTACTS, Accept: "application/json", "Content-Type": "application/json" },
      signal: AbortSignal.timeout(timeLeft(deadline)),
    });
  } catch (e) {
    throw new GhlApiError(`GHL ${path.split("?")[0]}: ${String((e as Error)?.message ?? e)}`, true);
  }
  const out = (await r.json().catch(() => null)) as Record<string, unknown> | null;
  if (!r.ok) {
    const e = new GhlApiError(`GHL ${path.split("?")[0]} respondió ${r.status}: ${JSON.stringify(out)?.slice(0, 300)}`, r.status === 429 || r.status >= 500);
    e.status = r.status;
    throw e;
  }
  return out ?? {};
}

interface GhlField {
  id: string;
  name?: string;
  fieldKey?: string;
  dataType?: string;
  picklistOptions?: unknown[];
}

let fieldsCache: { at: number; fields: GhlField[] } | null = null;
/** Campos personalizados de contacto de la subcuenta (con caché mientras la función sigue caliente). */
async function contactFields(deadline?: number): Promise<GhlField[]> {
  if (fieldsCache && Date.now() - fieldsCache.at < FIELDS_TTL_MS) return fieldsCache.fields;
  const out = await ghlApi(`/locations/${apiConfig()!.locationId}/customFields?model=contact`, {}, deadline);
  const list = Array.isArray(out.customFields) ? (out.customFields as GhlField[]) : [];
  const fields = list.filter((f) => f && typeof f.id === "string");
  fieldsCache = { at: Date.now(), fields };
  return fields;
}

/** "contact.Tipo de proyecto" → "tipo_de_proyecto": para comparar claves y nombres sin acentos ni mayúsculas. */
const slug = (s: unknown) =>
  typeof s === "string"
    ? s
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .replace(/^contact\./, "")
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "")
    : "";

/** Campo de GHL para cada dato: primero por clave (contact.tipo_proyecto), si no por nombre ("tipo_proyecto"). */
function matchFields(keys: string[], fields: GhlField[]) {
  const found = new Map<string, GhlField>();
  for (const k of keys) {
    const f = fields.find((x) => slug(x.fieldKey) === k) ?? fields.find((x) => slug(x.name) === k);
    if (f) found.set(k, f);
  }
  return found;
}

const TRUE_WORDS = ["true", "si", "yes", "1", "verdadero"];
const FALSE_WORDS = ["false", "no", "0", "falso"];
const optionText = (o: unknown) => (typeof o === "string" ? o : typeof o === "object" && o ? String((o as { label?: unknown; value?: unknown }).label ?? (o as { value?: unknown }).value ?? "") : "");

/** El valor en el formato que pide el tipo de campo de GHL; undefined = no se manda (vacío o no encaja). */
function fieldValue(v: string | boolean, f: GhlField): string | number | string[] | undefined {
  const t = typeof v === "boolean" ? String(v) : v;
  if (t === "") return undefined;
  const type = (f.dataType || "TEXT").toUpperCase();
  if (["NUMERICAL", "FLOAT", "MONETORY"].includes(type)) {
    const n = Number(t);
    return Number.isFinite(n) ? n : undefined;
  }
  if (["SINGLE_OPTIONS", "RADIO", "CHECKBOX", "MULTIPLE_OPTIONS"].includes(type)) {
    // Solo una opción que exista en el campo (si no, GHL rechaza el contacto entero)
    const wanted = typeof v === "boolean" ? (v ? TRUE_WORDS : FALSE_WORDS) : [slug(t)];
    const opt = (f.picklistOptions || []).map(optionText).find((o) => o && wanted.includes(slug(o)));
    if (!opt) return undefined;
    return type === "CHECKBOX" || type === "MULTIPLE_OPTIONS" ? [opt] : opt;
  }
  return t;
}

/**
 * Crea o actualiza el contacto (GHL lo junta por email/WhatsApp, igual que la agenda) con cada dato del
 * payload en su campo personalizado. null si faltan GHL_API_TOKEN/GHL_LOCATION_ID.
 */
async function upsertContact(p: Payload, deadline: number) {
  const cfg = apiConfig();
  if (!cfg) return null;
  const keys = Object.keys(p).filter((k) => !STANDARD_KEYS.has(k));
  const match = matchFields(keys, await contactFields(deadline));
  const customFields: { id: string; field_value: string | number | string[]; text: boolean }[] = [];
  const skipped: string[] = [];
  for (const k of keys) {
    const f = match.get(k);
    if (!f) continue;
    const v = p[k as keyof Payload] as string | boolean;
    const value = fieldValue(v, f);
    if (value !== undefined) customFields.push({ id: f.id, field_value: value, text: TEXT_TYPES.has((f.dataType || "TEXT").toUpperCase()) });
    // false en un checkbox de una sola opción ("Sí") = sin tildar: no es un error
    else if (v !== "" && v !== false) skipped.push(`${k}=${v} (${f.dataType})`);
  }
  const upsert = (fields: typeof customFields) =>
    ghlApi(
      "/contacts/upsert",
      {
        method: "POST",
        body: JSON.stringify({
          locationId: cfg.locationId,
          firstName: p.nombre_pila,
          lastName: p.apellido,
          name: p.nombre,
          email: p.email,
          phone: p.whatsapp,
          source: "Web HABITAR",
          ...(p.pais_whatsapp ? { country: p.pais_whatsapp } : {}),
          customFields: fields.map(({ id, field_value }) => ({ id, field_value })),
        }),
      },
      deadline,
    );
  try {
    await upsert(customFields);
  } catch (e) {
    if (!(e instanceof GhlApiError) || e.retry) throw e;
    // Un campo se borró o cambió en GHL: la próxima vez se vuelven a leer
    fieldsCache = null;
    // GHL rechaza el contacto entero si un valor no le gusta: se reintenta solo con los campos de texto.
    const textOnly = customFields.filter((f) => f.text);
    if (![400, 422].includes(e.status) || textOnly.length === customFields.length) throw e;
    console.error("[ghl-lead] GHL rechazó algún campo, se guardan solo los de texto:", e.message);
    await upsert(textOnly);
    return { saved: textOnly.length, missing: keys.filter((k) => !match.has(k)), skipped };
  }
  return { saved: customFields.length, missing: keys.filter((k) => !match.has(k)), skipped };
}

/** Claves de campos personalizados que tiene que tener la subcuenta (las del payload menos las estándar). */
const CUSTOM_FIELD_KEYS = () =>
  Object.keys(ghlPayload({ nombre: "Prueba Diagnóstico", email: "prueba@example.com", whatsapp_num: "11 2345 6789", pais_codigo: "54" }, { device: "", location: "" })).filter((k) => !STANDARD_KEYS.has(k));

/** Diagnóstico: qué dato va a qué campo personalizado de GHL y cuáles no tienen campo. */
async function fieldsReport() {
  if (!apiConfig()) return { campos_personalizados: "SIN CONFIGURAR: faltan GHL_API_TOKEN y/o GHL_LOCATION_ID (sin estas, los campos de GHL quedan vacíos)", claves_esperadas: CUSTOM_FIELD_KEYS() };
  try {
    fieldsCache = null;
    const fields = await contactFields();
    const keys = CUSTOM_FIELD_KEYS();
    const match = matchFields(keys, fields);
    return {
      campos_personalizados: `OK: ${match.size} de ${keys.length} datos tienen campo en GHL`,
      mapeo: Object.fromEntries([...match].map(([k, f]) => [k, `${f.fieldKey ?? f.name} (${f.dataType ?? "?"})`])),
      sin_campo_en_ghl: keys.filter((k) => !match.has(k)),
    };
  } catch (e) {
    return { campos_personalizados: `ERROR: ${String((e as Error)?.message ?? e)} (¿el token tiene el permiso View Custom Fields?)` };
  }
}

export default async (req: Request, context: NetlifyContext = {}) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method === "GET" && new URL(req.url).searchParams.has("diagnostico")) {
    return json({
      funcion: "OK: la función ghl-lead está publicada y responde",
      GHL_WEBHOOK_URL: process.env.GHL_WEBHOOK_URL ? "cargada" : "FALTA (Netlify → Environment variables, y después Trigger deploy)",
      GHL_API_TOKEN: process.env.GHL_API_TOKEN ? "cargada" : "FALTA",
      GHL_LOCATION_ID: process.env.GHL_LOCATION_ID ? "cargada" : "FALTA",
      ...(await fieldsReport()),
    });
  }
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);

  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) return json({ ok: false, error: "too_large" }, 413);
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw);
    if (!body || typeof body !== "object" || Array.isArray(body)) throw 0;
  } catch {
    return json({ ok: false, error: "invalid_body" }, 400);
  }
  // Honeypot: OK sin mandar nada
  if (str(body.hr_k9, 200)) return json({ ok: true });

  let payload: Payload;
  try {
    const ua = req.headers.get("user-agent") || "";
    const geo = context?.geo;
    const location = [geo?.city, geo?.subdivision?.name, geo?.country?.code].filter(Boolean).join(", ");
    payload = ghlPayload(body, { device: /Mobi|Android|iPhone|iPad|iPod/i.test(ua) ? "mobile" : "desktop", location });
  } catch (e) {
    if (e instanceof InvalidField) {
      console.error(`[ghl-lead] NO LLEGÓ A GHL (campo inválido: ${e.message}):`, raw);
      return json({ ok: false, error: "invalid_field", field: e.message }, 400);
    }
    throw e;
  }

  // 1) Contacto con los campos personalizados, antes del webhook: cuando el workflow arranca ya los tiene.
  // Si GHL falla por algo pasajero (red, 429, 5xx), 502 sin disparar el webhook: el navegador reintenta todo
  // y el workflow no corre dos veces. Si es otra cosa (token sin permiso, dato rechazado), el webhook sale
  // igual para que el lead no se pierda.
  const started = Date.now();
  try {
    const r = await upsertContact(payload, started + TOTAL_BUDGET_MS - WEBHOOK_MIN_MS);
    if (!r) console.error("[ghl-lead] GHL_API_TOKEN/GHL_LOCATION_ID sin configurar: el contacto queda SIN campos personalizados");
    else {
      console.info(`[ghl-lead] Contacto actualizado: ${r.saved} campos personalizados`);
      if (r.missing.length) console.warn("[ghl-lead] Datos sin campo personalizado en GHL:", r.missing.join(", "));
      if (r.skipped.length) console.warn("[ghl-lead] Valores que no encajan en el tipo de campo de GHL:", r.skipped.join(", "));
    }
  } catch (e) {
    console.error("[ghl-lead] Campos personalizados NO guardados:", String((e as Error)?.message ?? e));
    if (e instanceof GhlApiError && e.retry) {
      console.error("[ghl-lead] NO LLEGÓ A GHL:", JSON.stringify(payload));
      return json({ ok: false, error: "ghl_api" }, 502);
    }
  }

  // 2) Webhook del workflow
  const hook = process.env.GHL_WEBHOOK_URL?.trim();
  if (!hook) {
    console.error("[ghl-lead] GHL_WEBHOOK_URL sin configurar. NO LLEGÓ A GHL:", JSON.stringify(payload));
    return json({ ok: false, error: "ghl_sin_configurar" }, 503);
  }
  try {
    const r = await fetch(hook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(timeLeft(started + TOTAL_BUDGET_MS, WEBHOOK_MIN_MS)),
    });
    if (!r.ok) throw new Error(`GHL respondió ${r.status}: ${(await r.text().catch(() => "")).slice(0, 300)}`);
    console.info("[ghl-lead] Enviado a GHL:", payload.nombre, payload.tipo_lead, payload.test ? "(prueba)" : "");
    return json({ ok: true });
  } catch (e) {
    console.error("[ghl-lead]", String((e as Error)?.message ?? e));
    console.error("[ghl-lead] NO LLEGÓ A GHL:", JSON.stringify(payload));
    return json({ ok: false, error: "ghl" }, 502);
  }
};
