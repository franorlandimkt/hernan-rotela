/**
 * Tracking del navegador: atribución (UTMs y parámetros de anuncio), consentimiento de cookies y eventos
 * del Meta Pixel. Sin Google Analytics ni Clarity.
 *  - El código base del Pixel (init + PageView) va inline en el <head> de Base.astro, solo si hay
 *    site.metaPixelId. Sin Pixel, window.fbq no existe y todas estas funciones no hacen nada.
 *  - Los eventos de conversión (Lead / LeadCaliente / LeadSinTerreno / Schedule) los dispara el formulario
 *    con el mismo event_id que manda la función de Netlify a la API de conversiones (Meta deduplica).
 *  - Go High Level: solo su script de External Tracking (Base.astro); los leads van por las funciones.
 */

type Fbq = (...args: unknown[]) => void;
declare global {
  interface Window {
    fbq?: Fbq;
  }
}

const CONSENT_KEY = "hr_consent";
const ATTR_KEY = "hr_attr";
/** Parámetros de la URL que se guardan al entrar (first-touch). */
export const ATTR_PARAMS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "campaign_id", "adset_id", "ad_id", "placement", "fbclid"] as const;

// ---------- storage seguro (modo privado / navegador interno que lo bloquea) ----------
const store = {
  get(k: string, s: () => Storage) {
    try {
      return s().getItem(k);
    } catch {
      return null;
    }
  },
  set(k: string, v: string, s: () => Storage) {
    try {
      s().setItem(k, v);
    } catch {
      /* noop */
    }
  },
};
const local = () => localStorage;
const session = () => sessionStorage;

const parse = (s: string | null): Record<string, string> | null => {
  try {
    const v = s ? JSON.parse(s) : null;
    return v && typeof v === "object" ? v : null;
  } catch {
    return null;
  }
};

// ---------- Consentimiento ----------
// El Pixel carga de entrada (opt-out). "Rechazar" lo revoca y deja de mandar eventos, también en las
// próximas visitas (applyConsent corre en cada página). La función tampoco manda ese lead a Meta.
export type Consent = "granted" | "denied" | null;
export const getConsent = (): Consent => store.get(CONSENT_KEY, local) as Consent;
export const consentDenied = () => getConsent() === "denied";
export function setConsent(v: "granted" | "denied") {
  store.set(CONSENT_KEY, v, local);
  window.fbq?.("consent", v === "granted" ? "grant" : "revoke");
}
export function applyConsent() {
  if (consentDenied()) window.fbq?.("consent", "revoke");
}

// ---------- Modo prueba (?modo=prueba): sin Pixel ni API de conversiones ----------
const TEST_KEY = "hr_prueba";
/** La página se abrió con ?modo=prueba (o ya se abrió así en esta pestaña). */
export function isTestMode(): boolean {
  try {
    if (new URLSearchParams(location.search).get("modo") === "prueba") {
      store.set(TEST_KEY, "1", session);
      return true;
    }
  } catch {
    /* noop */
  }
  return store.get(TEST_KEY, session) === "1";
}

// ---------- Eventos del Pixel ----------
/** Evento estándar con event_id (Lead, Schedule). Nunca en modo prueba. */
export function track(event: string, eventID: string, params: Record<string, string> = {}) {
  if (isTestMode()) return;
  window.fbq?.("track", event, params, { eventID });
}
/** Evento propio con event_id (LeadCaliente, LeadSinTerreno, CotizacionVista, ClickAgendar, ClickWhatsApp). */
export function trackCustom(event: string, eventID: string, params: Record<string, string> = {}) {
  if (isTestMode()) return;
  window.fbq?.("trackCustom", event, params, { eventID });
}

/**
 * Eventos que salen una sola vez por sesión (sessionStorage; si está bloqueado, una vez por página):
 * FormStart, FormStep (uno por paso), FormDisqualified (uno por motivo), CotizacionVista, ClickAgendar,
 * ClickWhatsApp. Nunca llevan datos personales. Devuelve false si ya había salido.
 */
const ONCE_KEY = "hr_once";
const memOnce = new Set<string>();
export function once(key: string): boolean {
  const saved: unknown = (() => {
    try {
      return JSON.parse(store.get(ONCE_KEY, session) || "[]");
    } catch {
      return [];
    }
  })();
  const sent = new Set<string>([...(Array.isArray(saved) ? saved.map(String) : []), ...memOnce]);
  if (sent.has(key)) return false;
  sent.add(key);
  memOnce.add(key);
  store.set(ONCE_KEY, JSON.stringify([...sent]), session);
  return true;
}
/** Embudo del formulario (solo Pixel, sin API de conversiones). */
export function trackFunnel(key: string, event: string, params?: Record<string, string | number>) {
  if (isTestMode() || !once(key)) return;
  if (params) window.fbq?.("trackCustom", event, params);
  else window.fbq?.("trackCustom", event);
}
/** Evento propio una vez por sesión, con event_id nuevo (CotizacionVista, ClickAgendar, ClickWhatsApp). */
export function trackOnce(key: string, event: string, params: Record<string, string> = {}) {
  if (isTestMode() || !once(key)) return;
  window.fbq?.("trackCustom", event, params, { eventID: newEventId() });
}

// ---------- Atribución ----------
/** Atribución de anuncio/UTM guardada también en localStorage (30 días): quien hizo clic en la pauta y
 *  vuelve otro día (otra pestaña, otro navegador interno, "abrir en Chrome") sigue contando como pauta. */
const ATTR_LAST_KEY = "hr_attr_ultima";
const ATTR_TTL_MS = 30 * 24 * 60 * 60 * 1000;
/** Copia en memoria: si el navegador interno bloquea el storage, la atribución no se pierde en la visita. */
let memAttr: Record<string, string> | null = null;

const fromUrl = (): Record<string, string> => {
  const q = new URLSearchParams(location.search);
  const data: Record<string, string> = {};
  ATTR_PARAMS.forEach((k) => {
    const v = q.get(k);
    if (v) data[k] = v.slice(0, 300);
  });
  if (data.fbclid) data.fbclid_ts = String(Date.now()); // para armar _fbc si no existe la cookie
  data.landing_url = location.href.split("#")[0].slice(0, 1000);
  data.referrer = document.referrer.slice(0, 1000);
  return data;
};
const hasAd = (d: Record<string, string>) => ATTR_PARAMS.some((k) => d[k]);

/**
 * Al cargar cualquier página: guarda en sessionStorage los parámetros de ATTR_PARAMS, la URL de entrada y
 * el referrer (first-touch dentro de la sesión). Si la visita trae UTMs/fbclid, además se guardan 30 días en
 * localStorage; una visita posterior sin parámetros usa esa última atribución.
 */
export function captureAttribution() {
  captureFbclid();
  const saved = parse(store.get(ATTR_KEY, session));
  if (saved) {
    memAttr = saved;
    return;
  }
  let data = fromUrl();
  if (hasAd(data)) store.set(ATTR_LAST_KEY, JSON.stringify({ ...data, ts: String(Date.now()) }), local);
  else {
    const last = parse(store.get(ATTR_LAST_KEY, local));
    if (last && Date.now() - Number(last.ts || 0) < ATTR_TTL_MS) {
      const { ts: _ts, ...prev } = last;
      data = { ...prev, landing_url: data.landing_url, referrer: data.referrer };
    }
  }
  memAttr = data;
  store.set(ATTR_KEY, JSON.stringify(data), session);
}
/**
 * Atribución para el envío. Nunca vacía: si no se capturó (storage bloqueado, script tardío), se lee la URL
 * actual. Si la de la sesión no trae anuncio pero la URL actual sí (llegó a otra página con UTMs), gana la URL.
 */
export function getAttribution(): Record<string, string> {
  const s = parse(store.get(ATTR_KEY, session)) ?? memAttr;
  const now = fromUrl();
  if (s && s.landing_url) return hasAd(s) || !hasAd(now) ? s : { ...now, landing_url: s.landing_url };
  captureAttribution();
  return memAttr ?? now;
}

// ---------- Identificadores de Meta (_fbp / _fbc) ----------
/** fbclid de la URL de entrada + cuándo llegó (ms): para armar _fbc si no hay cookie. */
const FBCLID_KEY = "hr_fbclid";
let memFbclid: Record<string, string> | null = null;

function captureFbclid() {
  const id = new URLSearchParams(location.search).get("fbclid");
  if (!id) return;
  const prev = parse(store.get(FBCLID_KEY, session)) ?? memFbclid;
  if (prev?.fbclid === id) return;
  memFbclid = { fbclid: id.slice(0, 500), ts: String(Date.now()) };
  store.set(FBCLID_KEY, JSON.stringify(memFbclid), session);
}

export const readCookie = (name: string) => {
  try {
    return decodeURIComponent((document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`)) || [])[1] || "");
  } catch {
    return "";
  }
};
/** Cookie _fbp del Pixel ("" si no existe: Pixel bloqueado, rechazado o sin configurar). */
export const getFbp = () => readCookie("_fbp");
/**
 * Cookie _fbc; si no existe pero la persona entró con fbclid, se arma con el formato de Meta:
 * fb.1.{hora de llegada en ms}.{fbclid}.
 */
export function getFbc(): string {
  const c = readCookie("_fbc");
  if (c) return c;
  const s = parse(store.get(FBCLID_KEY, session)) ?? memFbclid;
  if (s?.fbclid) return `fb.1.${s.ts || Date.now()}.${s.fbclid}`;
  const a = getAttribution();
  return a.fbclid ? `fb.1.${a.fbclid_ts || Date.now()}.${a.fbclid}` : "";
}

/** event_id único por envío (mismo en Pixel y API de conversiones). */
export const newEventId = () =>
  crypto.randomUUID ? crypto.randomUUID() : "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) => (+c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (+c / 4)))).toString(16));
