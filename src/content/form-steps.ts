/**
 * Preguntas del formulario ("Cotizá tu proyecto"). Una pregunta por pantalla.
 * - type "choice": botones grandes que avanzan solos al tocarlos (con texto chico opcional debajo).
 * - type "select": lista desplegable nativa (cómoda en el celular; en la compu se busca tecleando).
 * - type "contact": nombre, WhatsApp (con código de país) y email (último paso).
 *
 * El orden y las ramas (quién sigue, quién sale) están en src/scripts/lead.ts → nextStep().
 * Las funciones de Netlify importan este archivo para validar del lado del servidor: si cambiás el texto de
 * una opción, se actualiza solo en los dos lados (navegador y función). Ojo: cambiar el texto de una
 * opción cambia lo que se guarda en Sheets y GHL desde ese momento.
 * Los precios, el umbral de 250 m² y los bordes de los rangos están en src/data/site.ts → pricing.
 */
import { site, usd } from "../data/site";

/**
 * Opción de una pregunta. value = lo que se guarda (Sheets, GHL, Meta) · ui = texto chico debajo de la
 * opción en pantalla · wa = cómo se lee en un mensaje de WhatsApp (si no hay, value en minúscula).
 */
export interface Option {
  value: string;
  ui?: string;
  wa?: string;
}

export type Step =
  | { id: string; type: "choice"; q: string; options: readonly Option[]; cols?: 2 }
  | { id: string; type: "select"; q: string; options: readonly string[]; placeholder: string }
  | { id: "contacto"; type: "contact"; q: string };

const opts = (values: readonly string[]): Option[] => values.map((value) => ({ value }));

// ---------------------------------------------------------------------------
//  P1 — ¿Qué querés proyectar? (orden de prioridad del brief: barrio cerrado > lote urbano > multifamiliar)
// ---------------------------------------------------------------------------
export const TIPOS = {
  barrio: { value: "Una casa en un barrio cerrado", wa: "una casa en un barrio cerrado" },
  urbano: { value: "Una casa en un lote urbano", wa: "una casa en un lote urbano" },
  multi: { value: "Departamentos o vivienda multifamiliar", ui: "Varias unidades en un mismo lote", wa: "una vivienda multifamiliar" },
  /** Descalifica: FormDisqualified { reason: "regularizacion" }, mensaje amable + WhatsApp, sin agenda. */
  regularizacion: { value: "Regularizar o medir algo ya construido", ui: "Planos de algo que ya está hecho" },
} as const satisfies Record<string, Option>;

// ---------------------------------------------------------------------------
//  P2 — Lote (el filtro de Lead: sin lote se guarda igual como "Sin terreno")
// ---------------------------------------------------------------------------
export const TERRENOS = {
  si: { value: "Sí, ya tengo el lote", wa: "ya tengo el lote" },
  comprando: { value: "Lo estoy comprando (este mes o el próximo)", wa: "estoy comprando el lote" },
  /** Sin terreno: deja sus datos y ve el precio, pero no es Lead en Meta (LeadSinTerreno) ni ve la agenda. */
  no: { value: "Todavía no, lo estoy buscando", wa: "todavía estoy buscando el lote" },
} as const satisfies Record<string, Option>;

// ---------------------------------------------------------------------------
//  P3 — Provincia (las 24, Buenos Aires y CABA arriba) · P3b — Partido (solo Buenos Aires)
// ---------------------------------------------------------------------------
export const PROV_BA = "Buenos Aires";
export const PROV_CABA = "Ciudad de Buenos Aires (CABA)";
export const OUTSIDE_AR = "Fuera de Argentina";
export const PROVINCIAS = [
  PROV_BA,
  PROV_CABA,
  "Catamarca",
  "Chaco",
  "Chubut",
  "Córdoba",
  "Corrientes",
  "Entre Ríos",
  "Formosa",
  "Jujuy",
  "La Pampa",
  "La Rioja",
  "Mendoza",
  "Misiones",
  "Neuquén",
  "Río Negro",
  "Salta",
  "San Juan",
  "San Luis",
  "Santa Cruz",
  "Santa Fe",
  "Santiago del Estero",
  "Tierra del Fuego",
  "Tucumán",
] as const;
/** Última opción de la lista de partidos: cualquier partido fuera del radio. */
export const OTHER_PARTIDO = "Otro partido de la provincia";
/** Partidos dentro del radio (site.ts → partidosInRadius) en orden alfabético + "Otro partido". */
export const PARTIDOS = [...[...site.partidosInRadius].sort((a, b) => a.localeCompare(b, "es")), OTHER_PARTIDO];

// ---------------------------------------------------------------------------
//  P4 — Dirección de obra (solo dentro del radio) — dato, no cambia el precio
// ---------------------------------------------------------------------------
export const DIRECCION = [
  { value: "Sí, también quiero la dirección de obra", wa: "también me interesa la dirección de obra" },
  { value: "Solo el proyecto", wa: "por ahora solo el proyecto" },
  { value: "Todavía no lo sé" },
] as const satisfies readonly Option[];

// ---------------------------------------------------------------------------
//  P5 — m² (rangos con los bordes de site.ts → pricing.sizeBounds)
// ---------------------------------------------------------------------------
export interface SizeRange extends Option {
  /** m² del borde de abajo (sin borde = "Menos de …"). */
  min?: number;
  /** m² del borde de arriba (sin borde = "Más de …"). */
  max?: number;
}
const b = site.pricing.sizeBounds;
/** [150, 200, 300] → Menos de 150 m² · 150 a 200 m² · 200 a 300 m² · Más de 300 m². */
export const SIZES: readonly SizeRange[] = [
  { value: `Menos de ${b[0]} m²`, max: b[0] },
  ...b.slice(1).map((hi, i) => ({ value: `${b[i]} a ${hi} m²`, min: b[i], max: hi })),
  { value: `Más de ${b[b.length - 1]} m²`, min: b[b.length - 1] },
];

// ---------------------------------------------------------------------------
//  P6 — Etapas (el precio sale de acá). El servicio completo solo se ofrece dentro del radio.
// ---------------------------------------------------------------------------
export type StageKey = keyof typeof site.pricing.stages;
export interface EtapaOption extends Option {
  key: "ante" | "ejecutivo" | "completo" | "albanil";
  stages: readonly StageKey[];
  /** Solo dentro del radio (con plano municipal). */
  radiusOnly?: boolean;
}
export const ETAPAS: readonly EtapaOption[] = [
  {
    key: "ante",
    value: "Solo el anteproyecto",
    ui: "La planta de tu casa, aberturas y materialidad. En PDF y DWG.",
    wa: "solo el anteproyecto",
    stages: ["anteproyecto"],
  },
  {
    key: "ejecutivo",
    value: "Anteproyecto + proyecto ejecutivo",
    ui: "Suma fundaciones, plano de estructura, instalación sanitaria y eléctrica.",
    wa: "anteproyecto y proyecto ejecutivo",
    stages: ["anteproyecto", "ejecutivo"],
  },
  {
    key: "completo",
    value: "Proyecto completo con plano municipal",
    ui: "Suma la carpeta y la presentación en el municipio hasta el permiso y el cartel de obra.",
    wa: "el proyecto completo con plano municipal",
    stages: ["anteproyecto", "ejecutivo", "municipal"],
    radiusOnly: true,
  },
  {
    /** No es LeadCaliente (brief: "solo un plano para dárselo al albañil"). Ve el precio del anteproyecto. */
    key: "albanil",
    value: "Solo un plano para dárselo al albañil",
    wa: "solo un plano para el albañil",
    stages: ["anteproyecto"],
  },
];
export const etapaOf = (value?: string) => ETAPAS.find((e) => e.value === value);

// ---------------------------------------------------------------------------
//  P7 — Cuándo arranca (dato de intención) · P8 — Quién decide (dato; la pareja suma una línea en la agenda)
// ---------------------------------------------------------------------------
export const CUANDO = [
  { value: "Ya, este mes", wa: "ya, este mes" },
  { value: "En 1 a 3 meses", wa: "en 1 a 3 meses" },
  { value: "En 3 a 6 meses", wa: "en 3 a 6 meses" },
  { value: "En más de 6 meses", wa: "en más de 6 meses" },
  { value: "Todavía no lo sé" },
] as const satisfies readonly Option[];
export const DECIDE = opts(["Yo solo/a", "Con mi pareja", "Con mi familia"]);

/** Opciones de cada pregunta, para el formulario. */
export const CHOICES = {
  tipo: Object.values(TIPOS) as Option[],
  terreno: Object.values(TERRENOS) as Option[],
  direccion: DIRECCION as readonly Option[],
  m2: SIZES,
  etapas: ETAPAS,
  cuando: CUANDO as readonly Option[],
  decide: DECIDE,
};

/** Valores válidos de cada pregunta (los usa la validación del servidor). */
export const OPTIONS = {
  tipo: CHOICES.tipo.map((o) => o.value),
  terreno: CHOICES.terreno.map((o) => o.value),
  provincia: [...PROVINCIAS, OUTSIDE_AR] as string[],
  partido: PARTIDOS,
  direccion: CHOICES.direccion.map((o) => o.value),
  m2: SIZES.map((o) => o.value),
  etapas: ETAPAS.map((o) => o.value),
  cuando: CHOICES.cuando.map((o) => o.value),
  decide: DECIDE.map((o) => o.value),
};

/**
 * Preguntas en orden (las ramas están en lead.ts → nextStep): partido solo si la provincia es Buenos Aires;
 * dirección de obra solo dentro del radio; en etapas, "completo" solo dentro del radio.
 */
export const steps: Step[] = [
  { id: "tipo", type: "choice", q: "¿Qué querés proyectar?", options: CHOICES.tipo },
  { id: "terreno", type: "choice", q: "¿Ya tenés el lote?", options: CHOICES.terreno },
  { id: "provincia", type: "select", q: "¿En qué provincia está el lote (o dónde lo buscás)?", options: OPTIONS.provincia, placeholder: "Elegí la provincia" },
  { id: "partido", type: "select", q: "¿En qué partido?", options: OPTIONS.partido, placeholder: "Elegí el partido" },
  { id: "direccion", type: "choice", q: "¿También querés que dirija la obra?", options: CHOICES.direccion },
  { id: "m2", type: "choice", q: "¿Cuántos m² cubiertos te imaginás?", options: CHOICES.m2, cols: 2 },
  { id: "etapas", type: "choice", q: "¿Qué necesitás?", options: CHOICES.etapas },
  { id: "cuando", type: "choice", q: "¿Cuándo querés arrancar el proyecto?", options: CHOICES.cuando },
  { id: "decide", type: "choice", q: "¿Quién decide sobre la casa?", options: CHOICES.decide },
  { id: "contacto", type: "contact", q: "Tus datos" },
];

/** Preguntas de opción o lista, en orden (todo menos "contacto"). */
export const QUESTION_IDS = steps.filter((s) => s.type !== "contact").map((s) => s.id);
/** Número fijo de cada pantalla para el evento FormStep { step, step_name } (no cambia con las ramas). */
export const STEP_NUMBER: Record<string, number> = Object.fromEntries(steps.map((s, i) => [s.id, i + 1]));

// ---------------------------------------------------------------------------
//  Zona de trabajo y precio
// ---------------------------------------------------------------------------
/** ¿El lote está dentro del radio de 150 km? CABA siempre; Buenos Aires, si el partido está en la lista. */
export function inRadius(a: { provincia?: string; partido?: string }): boolean {
  if (a.provincia === PROV_CABA) return true;
  return a.provincia === PROV_BA && !!a.partido && a.partido !== OTHER_PARTIDO && (site.partidosInRadius as readonly string[]).includes(a.partido);
}
/** Etapas que se ofrecen según la zona (fuera del radio, sin el servicio completo). */
export const etapasFor = (a: { provincia?: string; partido?: string }) => ETAPAS.filter((e) => !e.radiusOnly || inRadius(a));

/** Honorarios en USD para m² y etapas: base hasta el umbral; los m² de más, extra. */
export function priceAt(m2: number, stages: readonly StageKey[]): number {
  const { threshold, stages: rates } = site.pricing;
  const under = Math.min(m2, threshold);
  const over = Math.max(0, m2 - threshold);
  return stages.reduce((sum, k) => sum + rates[k].base * under + rates[k].extra * over, 0);
}

export interface Quote {
  /** "upTo" = "hasta USD X" · "range" = "USD X – USD Y" · "from" = "desde USD X" */
  kind: "upTo" | "range" | "from";
  min?: number;
  max?: number;
  /** Texto para Sheets, GHL y la pantalla ("USD 6.000 – USD 8.000"). */
  text: string;
}
/**
 * Precio que se muestra después de dejar los datos, en los bordes del rango de m² elegido.
 * null si falta el tamaño o las etapas.
 */
export function quoteFor(m2Value?: string, etapaValue?: string): Quote | null {
  const size = SIZES.find((s) => s.value === m2Value);
  const etapa = etapaOf(etapaValue);
  if (!size || !etapa) return null;
  const min = size.min !== undefined ? priceAt(size.min, etapa.stages) : undefined;
  const max = size.max !== undefined ? priceAt(size.max, etapa.stages) : undefined;
  if (min === undefined) return { kind: "upTo", max, text: `hasta ${usd(max!)}` };
  if (max === undefined) return { kind: "from", min, text: `desde ${usd(min)}` };
  return { kind: "range", min, max, text: `${usd(min)} – ${usd(max)}` };
}
/** Duración de la pantalla "Calculando…" (ms). */
export const QUOTE_LOADING_MS = 2500;

// ---------------------------------------------------------------------------
//  Botón de origen ("Botón de origen" en Sheets y GHL)
// ---------------------------------------------------------------------------
/**
 * Cada botón que abre el formulario lleva data-cta="<clave>"; el formulario la lee por JS al abrir, sin
 * recargar. Desde otra página (blog, privacidad) llega como ?cta=<clave>#cotiza.
 * Botón nuevo → agregar su clave acá; si no, llega como "Sin botón".
 */
export const CTA_ORIGINS: Record<string, string> = {
  header: "Botón del menú (Agendar videollamada)",
  hero: "Portada (hero)",
  "hero-distancia": "Portada: planos a distancia",
  videollamada: "Qué te llevás de la videollamada",
  problema: "Después de El problema",
  "quien-soy": "Quién soy",
  etapas: "Las etapas del proyecto",
  costos: "Qué pagás y cómo",
  proyectos: "Proyectos",
  render: "Render ampliado (Quiero algo así)",
  testimonio: "Testimonio",
  "para-quien": "Para quién es",
  "sin-lote": "Todavía no tengo el lote",
  distancia: "Planos a distancia",
  faq: "Preguntas frecuentes",
  cierre: "Cierre (antes del formulario)",
  blog: "Blog",
  privacidad: "Política de privacidad",
};
export const isOrigin = (key: string) => Object.prototype.hasOwnProperty.call(CTA_ORIGINS, key);
/** Texto de "Botón de origen" según la clave guardada. */
export const originLabel = (key: string) => (isOrigin(key) ? CTA_ORIGINS[key] : "Sin botón (bajó hasta el formulario)");

// ---------------------------------------------------------------------------
//  WhatsApp (+54 por defecto)
// ---------------------------------------------------------------------------
/**
 * Códigos de país del selector (default +54). region = país (ISO) para el formato y la validación en el
 * navegador (src/scripts/phone.ts) y para el país en la API de conversiones. "Otro": cualquier país.
 */
export const COUNTRY_CODES = [
  { code: "54", label: "🇦🇷 +54", region: "AR" },
  { code: "595", label: "🇵🇾 +595", region: "PY" },
  { code: "598", label: "🇺🇾 +598", region: "UY" },
  { code: "56", label: "🇨🇱 +56", region: "CL" },
  { code: "591", label: "🇧🇴 +591", region: "BO" },
  { code: "55", label: "🇧🇷 +55", region: "BR" },
  { code: "51", label: "🇵🇪 +51", region: "PE" },
  { code: "57", label: "🇨🇴 +57", region: "CO" },
  { code: "58", label: "🇻🇪 +58", region: "VE" },
  { code: "593", label: "🇪🇨 +593", region: "EC" },
  { code: "52", label: "🇲🇽 +52", region: "MX" },
  { code: "34", label: "🇪🇸 +34", region: "ES" },
  { code: "39", label: "🇮🇹 +39", region: "IT" },
  { code: "1", label: "🇺🇸 +1", region: "US" },
  /** Cualquier otro país: escribe el número con su código (+44…). */
  { code: "otro", label: "🌎 Otro país", region: "" },
];
export const DEFAULT_CC = "54";

/** Límites de los campos (los usan el formulario y la validación del servidor: tienen que ser iguales). */
export const LIMITS = {
  name: { min: 2, max: 60 },
  email: { max: 120 },
  /** Dígitos del número sin el código de país (países que no están en PHONE_DIGITS). */
  phone: { min: 8, max: 12 },
};
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Códigos de país conocidos (para leer el código que venga escrito en el número), del más largo al más corto. */
const KNOWN_CODES = [...new Set(COUNTRY_CODES.map((c) => c.code).filter((c) => c !== "otro"))].sort((a, b) => b.length - a.length);
/** Dígitos del número nacional (sin código de país) por código; Argentina: 9 + área + número = 11. */
export const PHONE_DIGITS: Record<string, number> = { "54": 11, "1": 10, "52": 10, "595": 9, "598": 8, "56": 9, "591": 8, "34": 9, "55": 11, "51": 9 };

/**
 * Argentina: deja el número como lo usa WhatsApp, 9 + área + número (11 dígitos), sin el 0 de larga
 * distancia ni el 15 de los celulares. "011 15 2345-6789", "11 2345 6789", "9 11 2345 6789" → "91123456789".
 * Si no se puede leer, devuelve los dígitos como vinieron (y no valida).
 */
function normalizeAR(d: string): string {
  let n = d.replace(/^0+/, "");
  if (n.length === 11 && n.startsWith("9")) return n;
  if (n.length === 10) return `9${n}`;
  // Con el 15: área de 2 (solo 11), 3 o 4 dígitos + 15 + número (área + número = 10 dígitos)
  if (n.length === 13 && n.startsWith("9")) n = n.slice(1);
  if (n.length === 12) {
    for (const area of n.startsWith("11") ? [2] : [3, 4]) {
      if (n.slice(area, area + 2) === "15") return `9${n.slice(0, area)}${n.slice(area + 2)}`;
    }
  }
  return n;
}

/**
 * Lee el WhatsApp como venga (escrito a mano o del autocompletado: "11 2345-6789", "+54 9 11 2345 6789",
 * "0054 11…", "011 15 2345 6789") y devuelve código de país + número nacional. Si el número trae "+" o
 * "00", el código sale de ahí (gana sobre el selector). ok = largo correcto para ese país.
 * Es la misma lectura en el navegador y en las funciones: lo que el navegador acepta, el servidor lo acepta.
 */
export function parsePhone(raw: string, selectedCc: string): { cc: string; num: string; ok: boolean } {
  const s = raw.trim();
  let d = s.replace(/\D/g, "");
  let cc = selectedCc;
  const intl = s.startsWith("+") || s.startsWith("00") || selectedCc === "otro";
  if (s.startsWith("00")) d = d.slice(2);
  if (intl) {
    const hit = KNOWN_CODES.find((c) => d.startsWith(c));
    if (hit) {
      cc = hit;
      d = d.slice(hit.length);
    } else {
      // país que no está en la lista: se guarda el número internacional completo (+código y número)
      return { cc: "", num: d, ok: d.length >= 8 && d.length <= 15 };
    }
  } else if (cc === "54" && (d.length === 12 || d.length === 13) && d.startsWith("54")) {
    d = d.slice(2); // pegó el 54 sin "+" (541123456789 / 5491123456789)
  } else if (cc !== "54" && PHONE_DIGITS[cc] && d.length === PHONE_DIGITS[cc] + cc.length && d.startsWith(cc)) {
    d = d.slice(cc.length); // pegó el código sin "+"
  } else if (cc !== "54" && PHONE_DIGITS[cc] === undefined && d.length > LIMITS.phone.max && d.startsWith(cc)) {
    d = d.slice(cc.length);
  }
  if (cc === "54") d = normalizeAR(d);
  const want = PHONE_DIGITS[cc];
  let ok = want ? d.length === want : d.length >= LIMITS.phone.min && d.length <= LIMITS.phone.max;
  // Argentina: después del 9 va el área, 11 (AMBA) o una que empieza con 2 o 3 (nunca "15")
  if (ok && cc === "54") ok = /^9(?:11|[23]\d)\d{8}$/.test(d);
  // EE.UU.: el código de área y la central nunca empiezan con 0 ni 1
  if (ok && cc === "1") ok = /^[2-9]\d{2}[2-9]\d{6}$/.test(d);
  return { cc, num: d, ok };
}

/** Formato E.164: "+" + código de país + número, sin espacios (+5491123456789). */
export const E164_RE = /^\+[1-9]\d{7,14}$/;
/** WhatsApp en E.164 a partir de lo escrito y el código del selector; "" si el número no es válido. */
export function toE164(raw: string, selectedCc: string): string {
  const p = parsePhone(raw, selectedCc);
  const e164 = `+${p.cc}${p.num}`;
  return p.ok && E164_RE.test(e164) ? e164 : "";
}
/** País (ISO, minúscula) del código de WhatsApp, para la API de conversiones ("54" → "ar"). */
export const countryOfCc = (cc: string) => (COUNTRY_CODES.find((c) => c.code === cc && c.region)?.region ?? "").toLowerCase();
