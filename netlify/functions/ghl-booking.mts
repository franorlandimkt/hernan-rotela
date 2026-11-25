/**
 * Netlify Function — ghl-booking  (/.netlify/functions/ghl-booking)
 * ============================================================================
 * Agenda la videollamada con Hernán desde la pantalla final del formulario, sin el widget de GHL: la
 * persona elige día y hora en la web y no vuelve a escribir sus datos.
 *
 *  GET  ?tz=America/Argentina/Buenos_Aires → horarios libres del calendario de GHL (próximos DAYS días), en
 *       la zona horaria de la persona: { ok, slots: { "2026-11-26": ["2026-11-26T10:00:00-03:00", …] } }.
 *       Se piden en vivo cada vez: si Hernán cambia su disponibilidad en GHL, la web la ve al instante.
 *  POST { nombre, email, pais_codigo, whatsapp_num, provincia, start, tz, prueba, hr_k9 } → crea o actualiza
 *       el contacto (mismo email/WhatsApp que el lead) y la cita en ese horario. { ok, start, hora }.
 *       Antes de crear la cita guarda en el contacto: timezone (zona IANA del navegador), country (por el
 *       código del WhatsApp) y el campo personalizado hora_llamada_local con la fecha y hora en la zona de la
 *       persona ("jueves 26 de noviembre, 10:00 (hora de Argentina)"), así el workflow de "cita agendada" ya
 *       lo tiene; si la cita no se crea porque GHL falló, se borra.
 *       409 si el horario ya no está libre (la web vuelve a pedir los horarios; a la segunda, respaldo).
 *  Modo prueba (prueba=true): la cita se crea igual, con "[PRUEBA]" en el título, para borrarla después.
 *
 * Si algo falla (variables sin cargar, sin calendario en site.ts, token vencido, GHL caído), la web muestra el
 * widget de GHL (site.ts → ghlCalendarUrl) como respaldo: nunca se queda sin poder agendar.
 * Contacto + cita entran en 9 s (Netlify corta a los 10 s; si cortaba después de crear la cita, la persona
 * veía un error y podía agendar dos veces).
 *
 * Variables de entorno (README sección 5):
 *   GHL_API_TOKEN     token de la Private Integration de GHL (calendarios, contactos y View Custom Fields)
 *   GHL_LOCATION_ID   Location ID de la subcuenta
 * El ID del calendario está en site.ts → ghlCalendarId (o en la variable opcional GHL_CALENDAR_ID, que gana).
 *
 * Diagnóstico: GET ?diagnostico=1 → si están las variables y si GHL devuelve horarios.
 */
import { LIMITS, EMAIL_RE, toE164, parsePhone, countryOfCc } from "../../src/content/form-steps";
import { site } from "../../src/data/site";

/** Días hacia adelante que se ofrecen (GHL acepta hasta 31). */
const DAYS = 21;
const TIMEOUT_MS = 8000;
const BOOK_BUDGET_MS = 9000;
const MAX_BODY_BYTES = 8_000;
const VERSION_CALENDARS = "2021-04-15";
const VERSION_CONTACTS = "2021-07-28";
const AR_TZ = "America/Argentina/Buenos_Aires";
/** Campo personalizado del contacto con la fecha y hora de la llamada en la hora de la persona. */
const LOCAL_TIME_FIELD = "hora_llamada_local";
/** Lo máximo que se espera para encontrar ese campo (si GHL tarda, se agenda igual, sin el campo). */
const FIELD_LOOKUP_MS = 2500;
const FIELDS_TTL_MS = 10 * 60e3;

class InvalidField extends Error {}
/** GHL no aceptó el horario al crear la cita (ya no está libre). */
class SlotTaken extends Error {}
class GhlError extends Error {
  constructor(
    msg: string,
    public status: number,
  ) {
    super(msg);
  }
}

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, GET, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" };
const json = (body: object, status = 200) =>
  new Response(JSON.stringify(body, null, 2), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...CORS } });

const str = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim().slice(0, max) : "");

/** Zona horaria IANA válida o "". */
function validTimeZone(v: unknown): string {
  const tz = str(v, 64);
  try {
    if (tz) {
      new Intl.DateTimeFormat("en", { timeZone: tz });
      return tz;
    }
  } catch {
    /* inválida */
  }
  return "";
}
/** Zona horaria IANA válida; si no, la de Argentina. */
const timeZone = (v: unknown) => validTimeZone(v) || AR_TZ;

/**
 * Fecha y hora de la llamada en español y en la zona de la persona: "jueves 26 de noviembre, 10:00 (hora de
 * Argentina)". "hora de Argentina" si la zona del navegador tiene la misma hora que Argentina en ese
 * momento; si no, el nombre de la zona del navegador ("hora de Europa central"), para no decir una hora que
 * no es la de la persona.
 */
function localTime(iso: string, tz: string) {
  const d = new Date(iso);
  const part = (o: Intl.DateTimeFormatOptions, type: string) => new Intl.DateTimeFormat("es-AR", { timeZone: tz, ...o }).formatToParts(d).find((p) => p.type === type)?.value ?? "";
  const hora = new Intl.DateTimeFormat("es-AR", { timeZone: tz, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(d);
  const offset = (zone: string) => new Intl.DateTimeFormat("en", { timeZone: zone, timeZoneName: "longOffset" }).formatToParts(d).find((p) => p.type === "timeZoneName")?.value;
  const zona = offset(tz) === offset(AR_TZ) ? "hora de Argentina" : part({ timeZoneName: "longGeneric" }, "timeZoneName").replace(/\s*\((.+)\)$/, ", $1");
  const out = `${part({ weekday: "long" }, "weekday")} ${part({ day: "numeric" }, "day")} de ${part({ month: "long" }, "month")}, ${hora} (${zona})`;
  // Intl usa espacios especiales: espacios comunes para que se vean bien en mensajes
  return out.replace(/[  ]/g, " ");
}

/** ID del calendario: variable GHL_CALENDAR_ID (opcional) o site.ts → ghlCalendarId. */
const calendarId = () => process.env.GHL_CALENDAR_ID?.trim() || site.ghlCalendarId;

function config() {
  const token = process.env.GHL_API_TOKEN?.trim();
  const locationId = process.env.GHL_LOCATION_ID?.trim();
  if (!token || !locationId) throw new GhlError("GHL_API_TOKEN o GHL_LOCATION_ID sin configurar", 503);
  if (!calendarId()) throw new GhlError("Falta el ID del calendario en src/data/site.ts (ghlCalendarId)", 503);
  // GHL_API_BASE solo para pruebas locales (por defecto, la API de GHL)
  return { token, locationId, base: (process.env.GHL_API_BASE || "https://services.leadconnectorhq.com").replace(/\/$/, "") };
}

async function ghl(path: string, version: string, init: RequestInit = {}, deadline = Date.now() + TIMEOUT_MS) {
  const { token, base } = config();
  const r = await fetch(`${base}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, Version: version, Accept: "application/json", "Content-Type": "application/json" },
    signal: AbortSignal.timeout(Math.min(TIMEOUT_MS, Math.max(1000, deadline - Date.now()))),
  });
  const out = (await r.json().catch(() => null)) as Record<string, unknown> | null;
  if (!r.ok) throw new GhlError(`GHL ${path.split("?")[0]} respondió ${r.status}: ${JSON.stringify(out)?.slice(0, 300)}`, r.status);
  return out ?? {};
}

let fieldCache: { at: number; id: string } | null = null;
/** ID del campo personalizado hora_llamada_local (por clave contact.hora_llamada_local o por nombre); "" si no existe. */
async function localTimeFieldId(deadline: number) {
  if (fieldCache && Date.now() - fieldCache.at < FIELDS_TTL_MS) return fieldCache.id;
  const { locationId } = config();
  const out = await ghl(`/locations/${locationId}/customFields?model=contact`, VERSION_CONTACTS, {}, Math.min(deadline, Date.now() + FIELD_LOOKUP_MS));
  const slug = (v: unknown) =>
    typeof v === "string"
      ? v
          .normalize("NFD")
          .replace(/[̀-ͯ]/g, "")
          .toLowerCase()
          .replace(/^contact\./, "")
          .replace(/[^a-z0-9]+/g, "_")
          .replace(/^_+|_+$/g, "")
      : "";
  const list = (Array.isArray(out.customFields) ? out.customFields : []) as { id?: unknown; fieldKey?: unknown; name?: unknown }[];
  const f = list.find((x) => slug(x.fieldKey) === LOCAL_TIME_FIELD) ?? list.find((x) => slug(x.name) === LOCAL_TIME_FIELD);
  const id = typeof f?.id === "string" ? f.id : "";
  fieldCache = { at: Date.now(), id };
  return id;
}

/** Horarios libres por día ("AAAA-MM-DD" → horarios ISO con zona), solo días con algún horario. */
async function freeSlots(tz: string) {
  const now = Date.now();
  const q = new URLSearchParams({ startDate: String(now), endDate: String(now + DAYS * 864e5), timezone: tz });
  const out = await ghl(`/calendars/${calendarId()}/free-slots?${q}`, VERSION_CALENDARS);
  const slots: Record<string, string[]> = {};
  for (const [day, v] of Object.entries(out)) {
    const list = (v as { slots?: unknown })?.slots;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !Array.isArray(list)) continue;
    const ok = list.filter((s): s is string => typeof s === "string" && !Number.isNaN(Date.parse(s)) && Date.parse(s) > now);
    if (ok.length) slots[day] = ok;
  }
  return slots;
}

async function book(b: Record<string, unknown>) {
  const nombre = str(b.nombre, LIMITS.name.max);
  if (nombre.length < LIMITS.name.min) throw new InvalidField("nombre");
  const email = str(b.email, LIMITS.email.max).toLowerCase().replace(/\s/g, "");
  if (!EMAIL_RE.test(email)) throw new InvalidField("email");
  const rawPhone = str(b.whatsapp_num, 24);
  const selCc = str(b.pais_codigo, 4);
  const phone = toE164(rawPhone, selCc);
  if (!phone) throw new InvalidField("whatsapp_num");
  const start = str(b.start, 40);
  if (Number.isNaN(Date.parse(start)) || Date.parse(start) < Date.now()) throw new InvalidField("start");
  const test = b.prueba === true || b.prueba === "true";
  const { locationId } = config();
  const deadline = Date.now() + BOOK_BUDGET_MS;
  const [firstName, ...rest] = nombre.split(" ");
  // Zona horaria del navegador (IANA) y país por el código del WhatsApp
  const tz = validTimeZone(b.tz);
  const country = countryOfCc(parsePhone(rawPhone, selCc).cc).toUpperCase();
  const contact = { locationId, firstName, lastName: rest.join(" "), name: nombre, email, phone, source: "Web HABITAR", ...(tz ? { timezone: tz } : {}), ...(country ? { country } : {}) };

  // hora_llamada_local: si no se encuentra el campo (o GHL tarda), se agenda igual, sin el campo
  let fieldId = "";
  try {
    fieldId = await localTimeFieldId(deadline);
    if (!fieldId) console.warn(`[ghl-booking] No existe el campo personalizado "${LOCAL_TIME_FIELD}" en GHL: la cita se agenda sin él`);
  } catch (e) {
    console.error(`[ghl-booking] No se pudo leer el campo "${LOCAL_TIME_FIELD}":`, String((e as Error)?.message ?? e));
  }
  const horaLocal = localTime(start, tz || AR_TZ);

  // 1) Contacto: el mismo que crea ghl-lead (GHL lo junta por email/WhatsApp). La hora va antes de crear la
  // cita: cuando GHL dispara el workflow de "cita agendada", el campo ya está lleno.
  const c = await ghl(
    "/contacts/upsert",
    VERSION_CONTACTS,
    { method: "POST", body: JSON.stringify({ ...contact, ...(fieldId ? { customFields: [{ id: fieldId, field_value: horaLocal }] } : {}) }) },
    deadline,
  );
  const contactId = (c.contact as { id?: string } | undefined)?.id;
  if (!contactId) throw new GhlError(`GHL no devolvió el contacto: ${JSON.stringify(c).slice(0, 300)}`, 502);

  // 2) Cita en el horario elegido (GHL revisa que siga libre: si no, 400/409/422).
  try {
    await ghlAppointment(
      "/calendars/events/appointments",
      VERSION_CALENDARS,
      {
        method: "POST",
        body: JSON.stringify({
          calendarId: calendarId(),
          locationId,
          contactId,
          startTime: start,
          title: `${test ? "[PRUEBA] " : ""}Videollamada con ${nombre}`,
          appointmentStatus: "confirmed",
          toNotify: true,
        }),
      },
      deadline,
    );
  } catch (e) {
    // Horario ocupado: NO se borra (puede ser el reintento de una cita que sí se creó, o la persona elige otro
    // horario enseguida y se pisa). Otro error (GHL caído): se borra, para no dejar la hora de algo no agendado.
    if (fieldId && !(e instanceof SlotTaken) && deadline - Date.now() > 1000) {
      await ghl("/contacts/upsert", VERSION_CONTACTS, { method: "POST", body: JSON.stringify({ ...contact, customFields: [{ id: fieldId, field_value: "" }] }) }, deadline).catch(() => {});
    }
    throw e;
  }
  return { start, nombre, horaLocal, test };
}

async function ghlAppointment(path: string, version: string, init: RequestInit, deadline: number) {
  try {
    return await ghl(path, version, init, deadline);
  } catch (e) {
    if (e instanceof GhlError && [400, 409, 422].includes(e.status)) throw new SlotTaken(e.message);
    throw e;
  }
}

export default async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  const url = new URL(req.url);

  if (req.method === "GET") {
    if (url.searchParams.has("diagnostico")) {
      const out: Record<string, string> = {
        funcion: "OK: la función ghl-booking está publicada y responde",
        GHL_API_TOKEN: process.env.GHL_API_TOKEN ? "cargada" : "FALTA",
        GHL_LOCATION_ID: process.env.GHL_LOCATION_ID ? "cargada" : "FALTA",
        calendario: calendarId() || "FALTA en src/data/site.ts (ghlCalendarId)",
      };
      try {
        const s = await freeSlots(AR_TZ);
        out.horarios = `OK: ${Object.values(s).flat().length} horarios libres en ${Object.keys(s).length} días`;
      } catch (e) {
        out.horarios = `ERROR: ${String((e as Error)?.message ?? e)}`;
      }
      return json(out);
    }
    try {
      return json({ ok: true, slots: await freeSlots(timeZone(url.searchParams.get("tz"))) });
    } catch (e) {
      console.error("[ghl-booking] horarios:", String((e as Error)?.message ?? e));
      return json({ ok: false, error: "slots" }, 502);
    }
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
  if (str(body.hr_k9, 200)) return json({ ok: true });

  try {
    const r = await book(body);
    console.info("[ghl-booking] Cita agendada:", r.nombre, r.start, `(${r.horaLocal})`, r.test ? "(prueba)" : "");
    // hora: la misma frase que hora_llamada_local (la web la usa en /llamada-agendada)
    return json({ ok: true, start: r.start, hora: r.horaLocal });
  } catch (e) {
    if (e instanceof InvalidField) return json({ ok: false, error: "invalid_field", field: e.message }, 400);
    console.error("[ghl-booking] NO SE AGENDÓ:", String((e as Error)?.message ?? e));
    // El horario ya no está libre → la web vuelve a pedir los horarios
    if (e instanceof SlotTaken) return json({ ok: false, error: "slot_taken" }, 409);
    return json({ ok: false, error: "ghl" }, 502);
  }
};
