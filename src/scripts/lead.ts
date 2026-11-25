/**
 * Reglas del lead compartidas por el formulario (navegador) y las funciones de Netlify (servidor):
 * ramas del formulario (quién sigue y quién sale), si es Lead / LeadCaliente / Sin terreno, "Origen" de
 * Sheets y textos para WhatsApp y el resumen de GHL. Así el cálculo es el mismo en los dos lados.
 */
import { OPTIONS, TIPOS, TERRENOS, PROV_BA, QUESTION_IDS, CHOICES, inRadius, etapaOf, quoteFor, type Option } from "../content/form-steps";

/** Respuestas de las preguntas (ids de form-steps.ts). */
export interface FlowAnswers {
  tipo?: string;
  terreno?: string;
  provincia?: string;
  partido?: string;
  direccion?: string;
  m2?: string;
  etapas?: string;
  cuando?: string;
  decide?: string;
}

/** Pantalla de descarte: "Regularizar o medir algo ya construido" (FormDisqualified, sin datos, sin agenda). */
export const EXIT = "descarte";

/** ¿Esta respuesta lleva al descarte? */
export const isDisqualified = (a: FlowAnswers) => a.tipo === TIPOS.regularizacion.value;

/** Siguiente pantalla después de responder `id`. */
export function nextStep(id: string, a: FlowAnswers): string {
  switch (id) {
    case "tipo":
      return isDisqualified(a) ? EXIT : "terreno";
    case "terreno":
      return "provincia";
    case "provincia":
      if (a.provincia === PROV_BA) return "partido";
      return inRadius(a) ? "direccion" : "m2";
    case "partido":
      return inRadius(a) ? "direccion" : "m2";
    case "direccion":
      return "m2";
    case "m2":
      return "etapas";
    case "etapas":
      return "cuando";
    case "cuando":
      return "decide";
    case "decide":
      return "contacto";
  }
  return "tipo";
}

/** Motivo del evento FormDisqualified (uno por regla que lleva a EXIT). */
export function exitReason(id: string, a: FlowAnswers): string {
  if (id === "tipo" && isDisqualified(a)) return "regularizacion";
  return id;
}

/**
 * Preguntas que corresponden con las respuestas actuales, en orden (para "Paso X de N" y para borrar las
 * respuestas que dejaron de aplicar al volver atrás y cambiar una rama).
 */
export function activeSteps(a: FlowAnswers): string[] {
  return QUESTION_IDS.filter((id) => {
    if (id === "partido") return a.provincia === PROV_BA;
    if (id === "direccion") return inRadius(a);
    return true;
  });
}
/** Total de pantallas (preguntas que aplican + "Tus datos"). Sin provincia elegida cuenta las mínimas. */
export const totalSteps = (a: FlowAnswers) => activeSteps(a).length + 1;

const valid = (list: readonly string[], v?: string) => list.includes(v ?? "");
const validOrEmpty = (list: readonly string[], v?: string) => !v || list.includes(v);

/**
 * Respuestas válidas: es lo que exige el servidor para guardar el envío, tenga o no lote.
 *  - partido solo con Buenos Aires; dirección solo dentro del radio (opcional: sin JS puede faltar);
 *  - el servicio completo solo dentro del radio; regularización nunca se envía (es descarte);
 *  - cuándo y quién decide pueden faltar (nunca se pierde un lead por una pregunta de intención).
 */
export function validAnswers(a: FlowAnswers): boolean {
  const etapa = etapaOf(a.etapas);
  return (
    valid(OPTIONS.tipo, a.tipo) &&
    !isDisqualified(a) &&
    valid(OPTIONS.terreno, a.terreno) &&
    valid(OPTIONS.provincia, a.provincia) &&
    (a.provincia === PROV_BA ? valid(OPTIONS.partido, a.partido) : !a.partido) &&
    (inRadius(a) ? validOrEmpty(OPTIONS.direccion, a.direccion) : !a.direccion) &&
    valid(OPTIONS.m2, a.m2) &&
    !!etapa &&
    (!etapa.radiusOnly || inRadius(a)) &&
    validOrEmpty(OPTIONS.cuando, a.cuando) &&
    validOrEmpty(OPTIONS.decide, a.decide)
  );
}

/** Tiene el lote o lo está comprando. */
export const hasLand = (a: FlowAnswers) => a.terreno === TERRENOS.si.value || a.terreno === TERRENOS.comprando.value;

/**
 * ¿Es lead? Respuestas válidas y tiene lote (o lo está comprando). "Todavía no, lo estoy buscando" deja sus
 * datos y se guarda igual, pero se mide aparte (LeadSinTerreno) y no ve la agenda.
 */
export const qualifies = (a: FlowAnswers) => validAnswers(a) && hasLand(a);

/**
 * "Lead caliente" (evento LeadCaliente): es lead y no busca "solo un plano para dárselo al albañil".
 * Multifamiliar cuenta como caliente (tercera prioridad del brief, pero cliente que sí quiere).
 */
export const isHot = (a: FlowAnswers) => qualifies(a) && etapaOf(a.etapas)?.key !== "albanil";

/** "Con lote" / "Sin terreno" (Sheets "Tipo de lead", GHL tipo_lead). */
export const leadType = (a: FlowAnswers) => (qualifies(a) ? "Con lote" : "Sin terreno");

/** Precio que vio en pantalla ("USD 6.000 – USD 8.000"), "" si falta algo. */
export const quoteText = (a: FlowAnswers) => quoteFor(a.m2, a.etapas)?.text ?? "";

/** Ubicación legible: "Pilar, Buenos Aires" · "Córdoba" · "Fuera de Argentina". */
export const placeOf = (a: FlowAnswers) => (a.partido && a.provincia === PROV_BA ? `${a.partido}, ${a.provincia}` : (a.provincia ?? ""));

/** Nombre de la red para "Bio <red>" (utm_source en minúsculas). */
const BIO_NAMES: Record<string, string> = { tiktok: "TikTok", instagram: "Instagram", facebook: "Facebook", youtube: "YouTube", ig: "Instagram", fb: "Facebook" };

/**
 * Columna "Origen" de Sheets (y origen en GHL). Primero utm_medium (la pauta también llega con utm_source=facebook):
 *  - paid → "Pauta Meta"
 *  - bio  → "Bio TikTok" / "Bio Instagram" / "Bio Facebook" (según utm_source): lo que llega desde la bio
 *    de TikTok queda separado de la pauta.
 *  - otro caso con algún utm_* o IDs de anuncio → "Pauta Meta"; sin nada → "Orgánico / directo".
 */
export function originOf(attr: Record<string, string>): string {
  const medium = (attr.utm_medium || "").trim().toLowerCase();
  const source = (attr.utm_source || "").trim().toLowerCase();
  if (medium === "paid") return "Pauta Meta";
  if (medium === "bio") {
    const net = BIO_NAMES[source] ?? (source ? source.charAt(0).toUpperCase() + source.slice(1) : "");
    return net ? `Bio ${net}` : "Bio";
  }
  const anyAd = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "campaign_id", "adset_id", "ad_id"].some((k) => attr[k]);
  return anyAd ? "Pauta Meta" : "Orgánico / directo";
}

/** Texto de una opción para un mensaje (wa o el valor en minúscula). */
export const waOf = (list: readonly Option[], value?: string) => {
  const o = list.find((x) => x.value === value);
  return o?.wa ?? (value ? value.charAt(0).toLowerCase() + value.slice(1) : "");
};

/** Todas las respuestas en un texto, un renglón por dato (GHL "resumen", para leer el lead de un vistazo). */
export function summary(a: FlowAnswers, extra: [string, string][] = []): string {
  return [
    ["Proyecto", a.tipo ?? ""],
    ["Lote", a.terreno ?? ""],
    ["Ubicación", placeOf(a)],
    ["Dentro de 150 km", a.provincia ? (inRadius(a) ? "Sí" : "No") : ""],
    ["Dirección de obra", a.direccion ?? ""],
    ["m²", a.m2 ?? ""],
    ["Etapas", a.etapas ?? ""],
    ["Precio que vio", quoteText(a)],
    ["Arranca", a.cuando ?? ""],
    ["Decide", a.decide ?? ""],
    ...extra,
  ]
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");
}

/** Tipos de proyecto para leer en un mensaje ("una casa en un barrio cerrado"). */
export const tipoWa = (a: FlowAnswers) => waOf(CHOICES.tipo, a.tipo);
