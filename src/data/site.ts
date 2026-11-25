/**
 * ============================================================================
 *  HABITAR · Rotela Báez — DATOS CENTRALES DEL SITIO
 * ============================================================================
 *  Todo número, link, precio o dato de negocio vive acá (un solo lugar para cada dato). Cambiar un valor
 *  en este archivo lo cambia en toda la web: HTML, JSON-LD, llms.txt, formulario y funciones de Netlify.
 *
 *  Convención de marcas:
 *   [COMPLETAR]    → dato que todavía no existe (IDs, dominio, WhatsApp). La web funciona sin él.
 *   [CONFIRMAR]    → dato del brief o estimación razonable. Validar con Hernán / Franco.
 *   [PLACEHOLDER]  → material inventado o pendiente. No se publica hasta reemplazarlo.
 *
 *  Lista de pendientes:  npm run pendientes
 *
 *  Reglas de identidad (no negociables):
 *   - Hernán es Maestro Mayor de Obras (M.M.O.) matriculado. NUNCA "arquitecto", "Arq.", "estudio de
 *     arquitectura" ni "despacho".
 *   - Sin número de matrícula ni colegio en ningún lado (copy, JSON-LD, footer).
 *   - Solo material propio (renders, planos, obras donde él es el profesional).
 * ============================================================================
 */

export const site = {
  /** Dominio final, sin barra al final. [COMPLETAR] Hernán no tiene dominio todavía: canonical, sitemap,
   *  JSON-LD y OG salen de acá. Mientras tanto, el subdominio de Netlify. */
  url: "https://habitar-rotela.netlify.app", // [COMPLETAR] dominio propio

  brand: "HABITAR",
  /** Marca + nombre: así va la primera vez en cada pieza (manual de marca, sección 2). */
  brandFull: "HABITAR · Rotela Báez",
  person: "Hernán Rotela Báez",
  personLegal: "Edgar Hernán Rotela Báez",
  firstName: "Hernán",
  /** Título profesional. Nunca "arquitecto". */
  profession: "Maestro Mayor de Obras",
  professionShort: "M.M.O.",
  credential: "Maestro Mayor de Obras matriculado",
  /** Bajada de marca (frase de Hernán). */
  tagline: "Construyo tu hogar desde mi experiencia en obra y como profesional.",
  /** Frase suya para "Quién soy". */
  motto: "Siempre estoy construyéndome.",

  /** Base de trabajo (oficina en su casa): sin calle publicada. */
  base: {
    locality: "El Jagüel",
    partido: "Esteban Echeverría",
    region: "Buenos Aires",
    regionLabel: "zona sur del GBA",
    country: "AR",
    geo: { lat: -34.8297, lng: -58.4983 }, // [CONFIRMAR] centro de El Jagüel, no la dirección de la oficina
  },

  /** Números sostenibles (brief, noviembre 2026). */
  stats: {
    yearsOnSite: 20, // "Más de 20 años en obra"
    yearsProjects: 5, // "Más de 5 años haciendo proyectos"
    m2Approved: 1200, // "~1.200 m² de casas aprobadas en municipios"
    approvedPlans: 5, // planos municipales aprobados para mostrar (carátulas pendientes)
    projectsSince: 2021, // desde 2021 se dedica solo a proyectar y construir proyectos
  },

  social: {
    tiktok: { name: "TikTok", handle: "", url: "", followers: "31K" }, // [COMPLETAR] handle y URL
    facebook: { name: "Facebook", handle: "", url: "", followers: "16K" }, // [COMPLETAR] handle y URL
    instagram: { name: "Instagram", handle: "", url: "", followers: "9,8K" }, // [COMPLETAR] handle y URL
    youtube: { name: "YouTube", handle: "", url: "", followers: "" }, // [CONFIRMAR] ¿tiene canal? Sin URL no se muestra
  },
  /** Suma de seguidores (31K + 16K + 9,8K ≈ 56,8K): "+56K". */
  communityTotal: "+56K",

  /**
   * Videollamada con Hernán: lo que agenda el formulario. minutes: duración que se muestra · free: si es
   * false no se dice "sin costo" en ningún lado.
   */
  call: { minutes: 30, free: true }, // [CONFIRMAR] duración y que sea sin costo

  /**
   * WhatsApp de Hernán, formato wa.me: solo dígitos con código de país (549 + área + número, sin 0 ni 15).
   * Vacío = los botones de WhatsApp no se muestran (la web funciona igual).
   */
  whatsapp: "", // [COMPLETAR] ej. "5491123456789"
  whatsappDisplay: "", // [COMPLETAR] ej. "+54 9 11 2345-6789"
  /** Email de contacto (política de privacidad y JSON-LD). Vacío = no se muestra. */
  email: "", // [COMPLETAR]

  // --------------------------------------------------------------------------
  //  Zona de trabajo
  // --------------------------------------------------------------------------
  /**
   * Con plano municipal o dirección de obra: hasta radiusKm de El Jagüel. Sin plano municipal (solo
   * anteproyecto y ejecutivo): todo el país y el exterior.
   * Partidos de la provincia de Buenos Aires dentro del radio (el formulario los lista; "Otro partido" = fuera).
   * CABA cuenta como dentro del radio. Distancias en línea recta desde El Jagüel a la cabecera de cada
   * partido (coordenadas aproximadas): por ruta es más. Los que dicen "borde" están a más de 125 km.
   * [CONFIRMAR] Franco valida la lista completa con Hernán.
   */
  radiusKm: 150,
  partidosInRadius: [
    "Almirante Brown",
    "Avellaneda",
    "Baradero", // 146 km, borde
    "Berazategui",
    "Berisso",
    "Brandsen",
    "Campana",
    "Cañuelas",
    "Capitán Sarmiento", // 139 km, borde
    "Carmen de Areco", // 131 km, borde
    "Chascomús",
    "Chivilcoy", // 139 km, borde
    "Ensenada",
    "Escobar",
    "Esteban Echeverría",
    "Exaltación de la Cruz",
    "Ezeiza",
    "Florencio Varela",
    "General Belgrano",
    "General Las Heras",
    "General Paz",
    "General Rodríguez",
    "General San Martín",
    "Hurlingham",
    "Ituzaingó",
    "José C. Paz",
    "La Matanza",
    "La Plata",
    "Lanús",
    "Las Flores", // 142 km, borde
    "Lezama", // 128 km, borde
    "Lobos",
    "Lomas de Zamora",
    "Luján",
    "Magdalena",
    "Malvinas Argentinas",
    "Marcos Paz",
    "Mercedes",
    "Merlo",
    "Monte",
    "Moreno",
    "Morón",
    "Navarro",
    "Pila", // 134 km, borde
    "Pilar",
    "Presidente Perón",
    "Punta Indio",
    "Quilmes",
    "Roque Pérez",
    "Saladillo", // 147 km, borde
    "San Andrés de Giles",
    "San Antonio de Areco",
    "San Fernando",
    "San Isidro",
    "San Miguel",
    "San Vicente",
    "Suipacha",
    "Tigre",
    "Tres de Febrero",
    "Vicente López",
    "Zárate",
  ],

  // --------------------------------------------------------------------------
  //  Precios (honorarios en USD, tarifa estándar). La tarifa mínima NO va en la web.
  // --------------------------------------------------------------------------
  /**
   * Precio por m² de cada etapa: `base` hasta `threshold` m²; los m² por encima pagan `extra`.
   * Valores de control (tests/pricing.test.ts): completo 150 m² = USD 6.000 · 200 = 8.000 · 250 = 10.000 ·
   * 300 = 11.500 · anteproyecto + ejecutivo 300 = 8.500 · solo anteproyecto 300 = 4.250.
   */
  pricing: {
    currency: "USD",
    threshold: 250,
    stages: {
      anteproyecto: { base: 15, extra: 10 },
      ejecutivo: { base: 15, extra: 10 },
      municipal: { base: 10, extra: 10 },
    },
    /**
     * Bordes de los rangos de m² del formulario: [150, 200, 300] → "Menos de 150 m²", "150 a 200 m²",
     * "200 a 300 m²", "Más de 300 m²". El precio se calcula en los bordes: el primero muestra "hasta USD X",
     * el último "desde USD X".
     */
    sizeBounds: [150, 200, 300] as readonly number[],
  },

  /** Plazos aproximados (sin compromiso por escrito; el municipio no depende de Hernán). */
  timing: {
    anteproyecto: "alrededor de 1 mes",
    ejecutivo: "1 a 2 meses, según los m²",
    municipio: "2 a 7 meses",
  },
  /** Instancias de correcciones completas incluidas en el anteproyecto. */
  corrections: 3,

  /** Formas de pago por etapa (% en cada hito). */
  paymentPlans: {
    completo: [
      { pct: 20, when: "al empezar" },
      { pct: 30, when: "al entregar el anteproyecto" },
      { pct: 30, when: "al entregar el proyecto ejecutivo" },
      { pct: 20, when: "al presentar la carpeta en el municipio" },
    ],
    anteproyectoEjecutivo: [
      { pct: 30, when: "al empezar" },
      { pct: 40, when: "al entregar el anteproyecto" },
      { pct: 30, when: "al entregar el proyecto ejecutivo" },
    ],
    anteproyecto: [
      { pct: 50, when: "al empezar" },
      { pct: 50, when: "al entregar el anteproyecto" },
    ],
  },
  /** Medios de pago (FAQ, JSON-LD, llms.txt). */
  payments: ["Transferencia (Mercado Pago o CBU)", "Dólares por Mercado Pago", "Dólares billete", "Pesos en efectivo", "Western Union (desde el exterior)"],
  /** Gastos que paga el cliente aparte de los honorarios, solo con el servicio completo (plano municipal). */
  extraCosts: ["Boleta CEP", "CAAITBA", "Timbrado del contrato", "Derechos de construcción del municipio"],
  /** Dirección de obra y construcción: solo en barrios cerrados o proyectos importantes. */
  construction: { minUsdPerStage: 120000 }, // [CONFIRMAR] si se publica el mínimo

  // --------------------------------------------------------------------------
  //  Tracking y CRM (no existe ninguno todavía: la web funciona igual en modo prueba)
  // --------------------------------------------------------------------------
  /** ID del Meta Pixel ([PIXEL_ID]). Vacío = no se carga el Pixel y la función no manda a la API de conversiones. */
  metaPixelId: "", // [COMPLETAR] [PIXEL_ID]
  /** Seguimiento externo de Go High Level (Settings → External Tracking). Vacío = no se carga. */
  ghlTrackingId: "", // [COMPLETAR]
  /** Calendario de GHL: link de booking ([GHL_CALENDAR_URL]), respaldo si la agenda propia no carga. */
  ghlCalendarUrl: "", // [COMPLETAR] [GHL_CALENDAR_URL]
  /** ID del calendario (el final del link de arriba): la web pide sus horarios libres y agenda ahí. */
  ghlCalendarId: "", // [COMPLETAR]
  /**
   * Base de las funciones de Netlify. Vacío = mismo dominio (/.netlify/functions/…), lo normal en Netlify.
   * Si el dominio se publica en otro hosting, poner acá el subdominio de Netlify (ej. "https://habitar-rotela.netlify.app").
   */
  functionsBase: "",

  // --------------------------------------------------------------------------
  //  Marca
  // --------------------------------------------------------------------------
  logo: {
    horizontal: "/brand/habitar-horizontal.svg",
    horizontalInverse: "/brand/habitar-horizontal-inverso.svg",
    oneColor: "/brand/habitar-horizontal-1color.svg",
    iso: "/brand/habitar-isotipo.svg",
    isoInverse: "/brand/habitar-isotipo-inverso.svg",
    profile: "/brand/habitar-perfil.svg",
  },
  /** Imagen para compartir (1200x630). [PLACEHOLDER] generada con el logo: reemplazar por una foto de Hernán. */
  ogImage: "/og.png",
  themeColor: "#161616",

  /**
   * Video vertical de Hernán (VSL), flotante en la home. src vacío = se muestra el póster [PLACEHOLDER] y no
   * se intenta reproducir. Arranca quieto; con sonido al primer toque.
   */
  video: {
    src: "", // [COMPLETAR] "/video/hernan.mp4"
    poster: "/video/hernan-poster.svg", // [PLACEHOLDER]
  },
  /**
   * Video de /llamada-agendada (después de agendar). La barra de avance no es lineal: llega a barTo cuando
   * pasó barAt del video y el resto avanza lento hasta el final.
   */
  bookedVideo: {
    src: "", // [COMPLETAR] "/video/confirmacion.mp4"
    poster: "/video/confirmacion-poster.svg", // [PLACEHOLDER]
    width: 405,
    height: 720,
    barAt: 0.2,
    barTo: 0.5,
  },
} as const;

/** Endpoints de las funciones (site.functionsBase vacío = mismo dominio). */
const fn = (name: string) => `${site.functionsBase.replace(/\/$/, "")}/.netlify/functions/${name}`;
export const endpoints = {
  lead: fn("submit-lead"),
  ghl: fn("ghl-lead"),
  booking: fn("ghl-booking"),
};

/** Link de WhatsApp con texto prearmado ("" si todavía no hay número). */
export const waLink = (text: string) => (site.whatsapp ? `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(text)}` : "");

/**
 * Link al calendario de GHL con ?utm_source=web y los datos precargados (first_name, last_name, email,
 * phone). "" si todavía no hay calendario.
 */
export const calendarLink = (prefill: Record<string, string> = {}) => {
  if (!site.ghlCalendarUrl) return "";
  const u = new URL(site.ghlCalendarUrl);
  u.searchParams.set("utm_source", "web");
  for (const [k, v] of Object.entries(prefill)) if (v) u.searchParams.set(k, v);
  return u.href;
};

/** Números en español de Argentina: 1200 → "1.200". */
export const fmt = (n: number) => new Intl.NumberFormat("es-AR").format(n);
/** 6000 → "USD 6.000". */
export const usd = (n: number) => `USD ${fmt(n)}`;

/** Redes con URL cargada (las que no tienen URL no se muestran). */
export const socialList = () => Object.entries(site.social).filter(([, s]) => s.url) as [keyof typeof site.social, (typeof site.social)[keyof typeof site.social]][];
