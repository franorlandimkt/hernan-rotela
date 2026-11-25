/**
 * ============================================================================
 *  COPY DE LA WEB — un objeto por sección, en el mismo orden que la página.
 * ============================================================================
 *  Cambiar textos acá NUNCA requiere tocar componentes.
 *  Voz (manual HABITAR, sección 7): Hernán habla en primera persona, en voseo, directo, con opinión y con
 *  datos. El formulario habla de él en tercera persona ("agendá tu videollamada con Hernán").
 *  - Nunca "arquitecto", "Arq.", "estudio" ni "despacho": es Maestro Mayor de Obras.
 *  - Nunca prometer lo que no controla: plazos del municipio, aprobación del barrio, costo de obra.
 *  - Nada de "sueño", "calidad", "compromiso" o "excelencia" sin un hecho atrás. Sin emojis.
 *  Títulos: lo que va entre *asteriscos* va en ladrillo (solo títulos grandes, ≥24 px). **dobles** = negrita.
 *  Los números salen de src/data/site.ts (no escribirlos a mano acá).
 *  Marcas: [CONFIRMAR] = validar con Hernán · [PLACEHOLDER] = pendiente, no se publica.
 * ============================================================================
 */
import { site, fmt } from "../data/site";

const callTime = `${site.call.minutes} minutos`;
const t = site.timing;

export const meta = {
  homeTitle: `Proyecto y plano municipal de tu casa en barrio cerrado | ${site.brandFull}`,
  homeDescription: `${site.person}, ${site.credential}: proyecto, plano municipal y dirección de obra de casas en barrios cerrados del GBA. Planos a distancia para todo el país.`,
  ogAlt: `${site.brandFull} · ${site.profession}`,
};

export const header = {
  cta: "Cotizá tu proyecto",
  ctaShort: "Cotizá",
  home: "Inicio",
};

export const hero = {
  label: `${site.person} · ${site.credential}`,
  /** Único H1 de la página. *…* = ladrillo. */
  h1: "Tu casa en barrio cerrado, proyectada por alguien que *sabe construirla*.",
  sub: `Diseño, firmo y presento el plano de tu casa en el barrio y en el municipio. Y si tu lote está a menos de ${site.radiusKm} km de ${site.base.locality}, también dirijo la obra.`,
  /** Datos en mono, separados por " · " */
  proof: [`+${site.stats.yearsOnSite} años en obra`, `+${fmt(site.stats.m2Approved)} m² aprobados`, `${site.social.tiktok.followers} en TikTok`],
  ctaPrimary: "Ver el precio de mi proyecto",
  ctaNote: "2 minutos · ves el precio en pantalla",
  ctaSecondary: "Cómo trabajo",
  /** Segunda línea del negocio: planos a distancia (link a la sección). */
  remote: "¿Tu lote está en otra provincia o fuera del país?",
  remoteLink: "También hago el proyecto a distancia",
  /** Rótulo de carátula de la ilustración (la "ficha" de tu casa). */
  sheet: [
    ["Obra", "Tu casa"],
    ["Ubicación", "Barrio cerrado · GBA"],
    ["Profesional", `${site.person}, ${site.professionShort}`],
    ["Etapas", "Anteproyecto · Ejecutivo · Municipal"],
    ["Escala", "1:100"],
    ["Estado", "Por empezar"],
  ] as [string, string][],
  sheetLabel: "Rótulo de plano de ejemplo",
  drawingTitle: "Dibujo de línea de la fachada de una casa de dos volúmenes, con sus cotas",
};

export const problem = {
  label: "Lo que nadie te dice",
  h2: "Lo caro no es el proyecto. Es *construir sin uno bueno*.",
  points: [
    { icon: "receipt", title: "Aparece algo más para pagar.", text: "Firmaste y después te enteraste del colegio, el timbrado y los derechos del municipio. Eso se sabe antes de empezar." },
    { icon: "gate", title: "El barrio no te deja arrancar.", text: "En un barrio cerrado, sin plano aprobado no te dejan poner un ladrillo." },
    { icon: "ruler", title: "Lo construido no coincide con el plano.", text: "Unos metros de más sin avisar aparecen en la inspección municipal. Y se pagan." },
    { icon: "crack", title: "Firmó cualquiera y construyó cualquiera.", text: "Rajaduras, filtraciones y humedad: pasa cuando el que firma no sabe cómo se construye y en la obra no hay nadie que responda." },
  ],
  closing: "Todo eso se evita antes de empezar: con un proyecto completo y un profesional que firma y responde por él.",
  cta: "Cotizá tu proyecto",
};

export const about = {
  label: "Quién soy",
  h2: "Le pasaba ladrillos a mi papá. Hoy *firmo el plano*.",
  /** Historia en primera persona (brief). Párrafos cortos. */
  story: [
    "Llegamos de Paraguay a Buenos Aires cuando yo tenía 6 años. Vivíamos en una carpa en el lote mientras mi papá, albañil toda la vida, levantaba la casita. Una noche pateé la vela que iluminaba la carpa y la prendí fuego: tuvimos que pedir otra prestada.",
    "Ahí empezó la curiosidad. Nadie me pidió ayuda: empecé solo, pasándole ladrillos y material. Faltaba a la escuela para ir a la obra con él y, cuando vio que ya era útil, me empezó a pagar.",
    "Terminé el secundario y arranqué ingeniería: volvía de la obra de noche, estudiaba hasta la madrugada y al otro día, obra otra vez. Veía llegar al patrón con los planos y pensaba: yo quiero ocupar ese puesto.",
    `Pasé por una oficina técnica, volví a la obra y aprendí electricidad, durlock, a ser capataz: la mayoría de los oficios. Me matriculé como ${site.profession} y en ${site.stats.projectsSince} dejé la obra para dedicarme solo a proyectar y construir los proyectos de mis clientes.`,
  ],
  quote: site.motto,
  /** Diferencial nº 1 en una línea (va destacada). */
  edge: "Diseño cada casa sabiendo cómo se construye, porque cada rubro lo hice con mis manos.",
  counters: [
    { value: site.stats.yearsOnSite, prefix: "+", suffix: "", label: "años en obra" },
    { value: site.stats.yearsProjects, prefix: "+", suffix: "", label: "años haciendo proyectos" },
    { value: site.stats.m2Approved, prefix: "+", suffix: " m²", label: "de casas aprobadas en municipios" },
  ] as { value: number; prefix?: string; suffix: string; label: string }[],
  /** Equipo. [CONFIRMAR] composición del equipo con Hernán (el brief da dos versiones). */
  team: "Trabajo con un equipo de dibujantes y profesionales externos (agrimensores, calculistas). Las consultas las atiendo yo.",
  /** [PLACEHOLDER] foto de Hernán con los planos de fondo (luz natural, como en sus videos). Sin foto no se muestra. */
  photo: "", // nombre del archivo en src/assets/img/ sin extensión, ej. "hernan-planos"
  photoAlt: "Hernán Rotela Báez en su oficina, con planos colgados atrás",
  cta: "Quiero hablar con Hernán",
};

export const stages = {
  label: "El servicio",
  h2: "Tu proyecto, en *tres etapas*.",
  sub: "Podés contratar solo la primera, las dos primeras o el proyecto completo hasta el cartel de obra. Viviendas unifamiliares y multifamiliares.",
  items: [
    {
      tag: "Etapa 01",
      title: "Anteproyecto",
      time: t.anteproyecto,
      text: "Arrancamos por tu plan de necesidades (lo que precisan, tus referencias de Pinterest, fotos o un croquis) y lo llevo a la planta de tu casa.",
      list: ["Planta de arquitectura", "Aberturas y materialidad", "Entrega en PDF y DWG", `${site.corrections} instancias de correcciones completas`],
      note: "En barrio cerrado, con el anteproyecto se pide la aprobación del barrio.",
    },
    {
      tag: "Etapa 02",
      title: "Proyecto ejecutivo",
      time: t.ejecutivo,
      text: "Todo lo que la obra necesita para construir lo que se diseñó, sin improvisar.",
      list: ["Replanteo de fundaciones", "Plano de estructura: vigas y losas", "Instalación sanitaria", "Instalación eléctrica", "Plano de escalera"],
    },
    {
      tag: "Etapa 03",
      title: "Plano municipal y tramitación",
      time: `El municipio tarda ${t.municipio}. Eso no depende de mí.`,
      text: "Armo la carpeta, la firmo y la presento. Las correcciones y visados que pida el municipio van sin costo extra.",
      list: ["Carpeta municipal y firmas profesionales", "Presentación en el municipio", "Correcciones y visados, sin costo extra", "Permiso y cartel de obra"],
      note: `Hasta ${site.radiusKm} km de ${site.base.locality}.`,
    },
  ],
  extra: {
    tag: "Opcional",
    title: "Dirección de obra y construcción",
    text: `Dentro de los ${site.radiusKm} km, sigo la obra para que se construya lo que se aprobó. Construyo solo en barrios cerrados o proyectos importantes.`,
  },
  cta: "Ver el precio de mi proyecto",
};

export const process = {
  label: "Cómo trabajo",
  h2: "Te explico cada parte del plano, *en video*.",
  steps: [
    { icon: "form", title: "Completás el formulario", text: "Me contás de tu lote y de la casa que querés. Al final ves el precio de tu proyecto.", time: "2 minutos" },
    { icon: "video", title: "Videollamada conmigo", text: "Elegís día y hora. Repasamos tu caso, qué necesitás para construir y qué vas a pagar aparte.", time: callTime },
    { icon: "map", title: "Reviso tu lote", text: "Con la plancheta catastral o la escritura dibujo el lote en AutoCAD y verifico la nomenclatura y la partida (en Buenos Aires, en CartoArba), para que el plano no salga con errores.", time: "Antes de dibujar" },
    { icon: "screen", title: "Te mando el PDF y un video", text: "Grabo la pantalla y te explico cada parte. Vos me devolvés audios o marcas en el PDF.", time: "En cada entrega" },
    { icon: "revision", title: "Ajustamos", text: "Normalmente son 2 o 3 cambios de fondo y después detalles.", time: `${site.corrections} correcciones incluidas` },
    { icon: "stamp", title: "Barrio y municipio", text: "Con el proyecto completo presento en el barrio y después en el municipio, hasta el permiso y el cartel de obra.", time: t.municipio },
  ],
  needsTitle: "Qué necesito de vos para arrancar",
  needs: [
    "La plancheta catastral, la escritura o el papel de posesión del lote.",
    "Tus referencias: fotos, Pinterest, plantas o un croquis.",
    "El partido y la dirección del lote, y si es barrio cerrado.",
    "Cuántos m² o qué ambientes te imaginás.",
  ],
  cta: "Agendar mi videollamada",
};

export const costs = {
  label: "Lo que pagás",
  h2: "Lo que pagás aparte, *te lo explico antes de firmar*.",
  sub: "Mis honorarios se pagan por etapa. Con el proyecto completo (con plano municipal) se suman gastos que no son míos: los cobran el colegio y el municipio.",
  extraTitle: "Gastos aparte, solo con plano municipal",
  extraNote: "El monto y el orden de pago cambian según cada municipio. Te explico cuáles son y cómo se calculan en el tuyo antes de arrancar. Con 1 o 2 etapas pagás solo mis honorarios.",
  plansTitle: "Cómo se pagan mis honorarios",
  plans: [
    { title: "Proyecto completo", key: "completo" },
    { title: "Anteproyecto + ejecutivo", key: "anteproyectoEjecutivo" },
    { title: "Solo anteproyecto", key: "anteproyecto" },
  ] as { title: string; key: keyof typeof site.paymentPlans }[],
  paymentsTitle: "Medios de pago",
  contractTitle: "Contrato",
  contract: ["Proyecto completo: contrato del colegio + contrato privado con el detalle.", "1 o 2 etapas: contrato privado."],
  cta: "Ver el precio de mi proyecto",
};

export const projects = {
  label: "Proyectos",
  h2: "Lo que muestro es *mío*.",
  sub: "Proyectos donde soy el profesional, con el estado real de cada uno. Nada de fotos de casas de otros.",
  /**
   * Fichas (rótulo de carátula). images: renders o planos propios de ese proyecto en src/assets/img/ (sin
   * extensión). Sin imágenes, la ficha va sola. Tocar una imagen la abre en grande y "Quiero algo así"
   * abre el formulario con el origen "render".
   * [CONFIRMAR] autorización para nombrar cada barrio. [PLACEHOLDER] renders pendientes (Drive).
   */
  items: [
    {
      key: "escobar",
      title: "Casa en dos plantas",
      place: "Escobar",
      m2: "255,67 m²",
      status: "Proyecto completo, de cero hasta el cartel de obra",
      note: "Mi primer proyecto completo. El que más orgulloso me tiene.",
      images: [] as { name: string; alt: string }[],
    },
    {
      key: "santa-clara",
      title: "Casa",
      place: "Barrio Santa Clara", // [CONFIRMAR] localidad
      m2: "350 m²",
      status: "En aprobación en el barrio",
      images: [] as { name: string; alt: string }[],
    },
    {
      key: "san-sebastian",
      title: "Casa",
      place: "San Sebastián, Pilar",
      m2: "245 m²",
      status: "En aprobación en el barrio",
      images: [] as { name: string; alt: string }[],
    },
    {
      key: "sourdeaux",
      title: "Vivienda multifamiliar",
      place: "Ingeniero Sourdeaux",
      m2: "176 m²",
      status: "Aprobada, en construcción",
      images: [] as { name: string; alt: string }[],
    },
  ] as { key: string; title: string; place: string; m2: string; status: string; note?: string; images: { name: string; alt: string }[] }[],
  sheetKeys: { obra: "Obra", place: "Ubicación", m2: "Superficie", status: "Estado" },
  /** Planos municipales aprobados (carátulas). [PLACEHOLDER] pendientes de subir al Drive: sin imágenes no se muestra. */
  approved: {
    title: `${site.stats.approvedPlans} planos municipales aprobados`,
    text: "Carátulas reales de planos aprobados en municipios.",
    images: [] as { name: string; alt: string }[],
  },
  /** Caso de Sergio, contado sin nombre. [CONFIRMAR] autorización para nombrarlo. */
  story: {
    tag: "Un caso",
    title: "De pileta y quincho a tres unidades.",
    text: "Un cliente no sabía qué hacer con su lote: pensaba en pileta y quincho para alquilar. Le propuse una vivienda multifamiliar de 3 unidades funcionales, para dividirlas y disponer de cada una. Hoy está en construcción.",
  },
  cta: "Quiero un proyecto así",
};

export const testimonial = {
  label: "Lo que dicen",
  h2: "Lo que me mandó Giselle cuando *terminamos su proyecto*.",
  /** Testimonio real (audio de WhatsApp). [CONFIRMAR] autorización para publicarlo con su nombre. */
  items: [
    {
      name: "Giselle",
      detail: "Casa de 255,67 m² en Escobar",
      source: "Audio de WhatsApp",
      text: "Ahí los estuve mirando, Hernán, enseguida. El proyecto me encanta cómo quedó, la verdad súper contenta con el resultado. Te quería agradecer la atención, súper bien, me tuviste paciencia, respondiste todas mis dudas, súper contenta con el trabajo y quería agradecerte ya que llegamos hasta el final del proyecto.",
      /** Audio original (public/audio/…): si existe, se muestra el reproductor. [COMPLETAR] */
      audio: "",
      publish: true,
    },
    // [PLACEHOLDER] más testimonios reales: con publish: false no se muestran.
    { name: "[PLACEHOLDER]", detail: "", source: "", text: "Testimonio real pendiente.", audio: "", publish: false },
  ],
  audioLabel: "Escuchar el audio",
  cta: "Quiero empezar mi proyecto",
};

export const fit = {
  label: "Para quién es",
  h2: "Te lo digo de frente: *no trabajo con todos*.",
  yesTitle: "Es para vos si…",
  yes: [
    "Ya tenés el lote (o lo estás por comprar), mejor si es en un barrio cerrado.",
    "Lo charlaron en familia y tienen referencias de lo que quieren.",
    "Querés el proyecto completo, con alguien que firme y responda por él.",
    "Sabés que un proyecto bien hecho vale lo que cuesta.",
  ],
  noTitle: "No es para vos si…",
  no: [
    "Buscás solo un plano para dárselo al albañil.",
    "Querés pagar el proyecto en 6 o 12 cuotas.",
    "Querés exprimir cada m² para vender.",
    "Necesitás regularizar o medir algo ya construido.",
  ],
  cta: "Es para mí: cotizar",
};

export const beforeLot = {
  label: "¿Todavía no tenés el lote?",
  h2: "Elegí el lote *pensando en la casa*.",
  sub: "Si lo vas a comprar en los próximos meses, este es el momento de mirar lo que después te puede frenar el plano.",
  checks: [
    "El reglamento del barrio: retiros, alturas y qué se puede construir.",
    "Que las medidas y la nomenclatura del lote coincidan con la escritura.",
    "Cuántos m² te deja construir el municipio en ese lote.",
    "La orientación: dónde da el sol y hacia dónde abre la casa.",
  ],
  text: "En TikTok explico todo esto con casos reales. Seguime y, cuando tengas el lote, lo vemos juntos.",
  ctaSocial: "Ver mis videos en TikTok",
  cta: "Igual quiero ver cuánto saldría",
};

export const remote = {
  label: "Planos a distancia",
  h2: "¿Construís en otra provincia o fuera del país?",
  text: "Te hago el anteproyecto y el proyecto ejecutivo a distancia: trabajamos por videollamada y WhatsApp, y te entrego el PDF y el DWG para que lo construya y lo presente un profesional de tu zona.",
  proof: "Ya tuve clientes que me contrataron y me pagaron desde el exterior.",
  note: `El plano municipal y la dirección de obra los hago hasta ${site.radiusKm} km de ${site.base.locality}.`,
  cta: "Cotizar a distancia",
};

const plan = (k: keyof typeof site.paymentPlans) => site.paymentPlans[k].map((p) => `${p.pct} % ${p.when}`).join(", ");

export const faq = {
  label: "Preguntas frecuentes",
  h2: "Lo que me preguntan *antes de contratar*",
  items: [
    {
      q: "¿Qué necesito para poder construir?",
      a: "Un proyecto aprobado. En barrio cerrado, primero lo aprueba el barrio (con el anteproyecto) y después el municipio, que da el permiso de obra. Para arrancar el proyecto necesito la plancheta catastral o la escritura del lote, tus referencias y saber qué casa querés.",
    },
    {
      q: "¿Cuánto tarda el proyecto?",
      a: `El anteproyecto, ${t.anteproyecto}. El proyecto ejecutivo, ${t.ejecutivo}. La aprobación municipal tarda ${t.municipio} y no depende de mí: no te prometo plazos que no controlo.`,
    },
    {
      q: "¿Tengo que pagar algo más aparte de tus honorarios?",
      a: `Solo con el proyecto completo con plano municipal: ${site.extraCosts.map((c) => c.charAt(0).toLowerCase() + c.slice(1)).join(", ")}. El monto cambia según el municipio y te explico cuáles son antes de firmar. Con 1 o 2 etapas, pagás solo mis honorarios.`,
    },
    {
      q: "¿Vos también construís?",
      a: `Sí, en barrios cerrados o proyectos importantes, dentro de los ${site.radiusKm} km de ${site.base.locality}. También hago la dirección de obra, para que se construya lo que se aprobó.`,
    },
    {
      q: "¿Qué firmás?",
      a: `Firmo el proyecto como ${site.credential}, presento el plano municipal y, si me contratás, la dirección de obra. Cuando el proyecto lo necesita, trabajo con agrimensores y calculistas.`, // [CONFIRMAR] qué no firma
    },
    {
      q: "¿Por qué no le pido el plano al albañil o a alguien que cobra menos?",
      a: "Porque el profesional que firma responde civil, penal y comercialmente por ese plano. El que cobra menos, si algo sale mal, a lo sumo no lo llamás más. Y un plano que no coincide con lo construido te lo frena el municipio.",
    },
    {
      q: "Ya tengo el diseño en la cabeza. ¿Me lo firmás y listo?",
      a: "Los honorarios son los mismos. Todos podemos tener un diseño en la cabeza, y ahí se queda si no contratás a un profesional que lo lleve a un plano que se pueda aprobar y construir.",
    },
    {
      q: "¿El proyecto incluye la estructura?",
      a: "El proyecto ejecutivo incluye el plano de estructura: fundaciones, vigas y losas. Cuando hace falta, trabajo con calculistas.",
    },
    {
      q: "¿Cuántas correcciones incluye?",
      a: `El anteproyecto incluye ${site.corrections} instancias de correcciones completas. Normalmente son 2 o 3 cambios de fondo y después detalles.`,
    },
    {
      q: "¿Cómo se paga?",
      a: `Por etapas. Proyecto completo: ${plan("completo")}. Anteproyecto + ejecutivo: ${plan("anteproyectoEjecutivo")}. Solo anteproyecto: ${plan("anteproyecto")}. Medios: ${site.payments.join(", ").toLowerCase()}.`,
    },
    {
      q: "¿Qué pasa si freno el proyecto a mitad de camino?",
      a: "Lo entregado o lo que está en ejecución no se devuelve. Por eso se paga por etapa: entre una y otra podés frenar cuando quieras.",
    },
    {
      q: "¿Cómo sé que es confiable si no te conozco?",
      a: "Me ves en TikTok explicando cómo se hace bien. Antes de contratar te muestro un video recorriendo el AutoCAD de un proyecto parecido, los PDF y planos aprobados reales. Y hablás conmigo, no con un vendedor.",
    },
    {
      q: "¿Hacés proyectos fuera de Buenos Aires o del país?",
      a: `Sí: el anteproyecto y el proyecto ejecutivo los hago a distancia, para todo el país y el exterior. El plano municipal y la dirección de obra, hasta ${site.radiusKm} km de ${site.base.locality}.`,
    },
  ],
};

export const form = {
  /** Título del formulario (también arriba de cada pregunta en el pop-up). */
  h2: "Cotizá tu proyecto",
  /** Debajo del título mientras responde (en la primera pantalla no va: ya lo dice intro.text). */
  sub: "Al terminar vas a ver el precio de tus planos.",
  /**
   * Primera pantalla: título (= h2), lead, texto y "Empezar". En text, *…*: el primero en negrita, el
   * segundo en ladrillo.
   */
  intro: {
    lead: "Respondé unas preguntas rápidas.",
    text: "Te toma *2 minutos* y ves *el precio de tus planos en pantalla*.",
    start: "Empezar",
    tag: "USD ?",
  },
  /**
   * Después de dejar los datos (el lead ya se envió y ya se midió): "Calculando…" y el precio según los m² y
   * las etapas (form-steps.ts → quoteFor, valores en site.ts → pricing). {m2} = "150 a 200 m²",
   * {etapas} = "anteproyecto y proyecto ejecutivo". La línea `extras` va siempre, debajo del precio.
   */
  quote: {
    loading: "Calculando el precio de tus planos…",
    label: "Precio de tus planos",
    /** Antes del monto en los rangos de los bordes: "hasta USD 6.000" (menos de 150 m²) · "desde USD 11.500" (más de 300 m²). */
    upTo: "hasta",
    from: "desde",
    meta: "Para {m2} · {etapas}. Tarifa estándar.",
    extras: "No incluye los gastos del colegio ni los derechos de construcción del municipio: dependen de cada municipio.",
    noLandTitle: "Cuando tengas el lote, agendá tu videollamada con Hernán.",
    noLandText: "Ahí te da el precio exacto y te dice qué necesitás para construir en ese lote. Mientras tanto, en TikTok explica qué mirar antes de comprarlo.",
  },
  /** Agenda (debajo del precio, solo con lote). */
  agenda: {
    title: "Para saber el precio exacto, agendá tu videollamada con Hernán",
    /** Junto a la foto: datos en una línea separados por " · " (site.ts). */
    hostStats: [`+${site.stats.yearsOnSite} años en obra`, `${site.social.tiktok.followers} en TikTok`],
    hostName: `${site.person}, ${site.professionShort}`,
    avatar: site.logo.profile, // [PLACEHOLDER] foto de Hernán: hoy va el perfil de la marca
    avatarAlt: `${site.person}`,
    /** Solo para lectores de pantalla (a la vista, la lista va directo debajo del título). */
    lead: "En la videollamada Hernán te da:",
    takeaways: ["El precio exacto de tu proyecto", "Qué necesitás para construir en tu lote", "Lo que vas a pagar aparte, antes de firmar"],
    /** Si en "¿Quién decide?" eligió pareja o familia. */
    partner: { "Con mi pareja": "Si deciden en pareja, conéctense los dos.", "Con mi familia": "Si deciden en familia, conéctense juntos." } as Record<string, string>,
  },
  back: "Atrás",
  next: "Siguiente",
  close: "Cerrar formulario",
  /** Avisos que se ven sin JS (todas las preguntas juntas). */
  noJs: {
    partido: "Solo si el lote está en la provincia de Buenos Aires",
    direccion: `Solo si el lote está a menos de ${site.radiusKm} km de ${site.base.locality} (CABA y GBA)`,
    completo: `El proyecto completo con plano municipal, solo hasta ${site.radiusKm} km de ${site.base.locality}`,
  },
  fields: {
    name: "Nombre",
    email: "Email",
    emailPlaceholder: "nombre@gmail.com",
    phone: "WhatsApp",
    phonePlaceholder: "Ej. 11 2345-6789",
    /** Ejemplo según el país elegido. Si el país no está, va phonePlaceholder. */
    phonePlaceholderBy: { "54": "Ej. 11 2345-6789", "595": "Ej. 981 123456", "598": "Ej. 94 123 456", "56": "Ej. 9 6123 4567", "34": "Ej. 612 34 56 78", "1": "Ej. (213) 803-2273", otro: "Ej. +44 7911 123456" } as Record<string, string>,
    countryCode: "Código de país",
    honeypot: "No completes este campo",
  },
  contactLead: "¡Buenísimo! Dejá tus datos y te mostramos el precio de tus planos en pantalla.",
  submit: "Ver el precio de mis planos",
  /** Debajo del botón (texto chico). Va a GHL como consentimiento_whatsapp=true con fecha y hora de Argentina. */
  consent: "Al enviar, aceptás que te contactemos por WhatsApp.",
  /** Antes de enviar se confirma el WhatsApp, con el número grande. text = con lote · textNoLand = sin lote. */
  confirm: {
    title: "¿Este es tu WhatsApp?",
    text: "Ahí te llega la confirmación y el link de la videollamada.",
    textNoLand: "Ahí te escribimos sobre tu proyecto.",
    yes: "Sí, es correcto",
    fix: "Corregir",
  },
  stepOf: (n: number, total: number) => `Paso ${n} de ${total}`,
  lastStep: "Último paso",
  /** Si intenta cerrar el formulario en "Tus datos" (X, tocar afuera, Escape o "atrás"). */
  leave: {
    title: "Te falta solo un paso para ver el precio de tus planos",
    stay: "Completar",
    go: "Salir igual",
  },
  errors: {
    choice: "Elegí una opción para seguir.",
    select: "Elegí una opción de la lista para seguir.",
    name: "Escribí tu nombre (al menos 2 letras) para saber cómo llamarte.",
    /** El nombre tiene 7 o más dígitos (si es un WhatsApp válido y ese campo está vacío, pasa solo). */
    nameIsPhone: "Parece que escribiste tu número acá. Poné tu nombre: el WhatsApp va en el campo de abajo.",
    nameDigits: "Escribí solo tu nombre, sin números.",
    email: "Revisá tu email, parece que le falta algo (ej. nombre@gmail.com).",
    phone: "Revisá tu WhatsApp: no tiene los dígitos de ese país (ej. 11 2345-6789 en Argentina).",
    phoneIntl: "Escribí tu WhatsApp con el código de tu país (ej. +44 7911 123456).",
    /** Tiene los dígitos justos pero ese número no existe en ese país (libphonenumber). */
    phoneInvalid: "Revisá tu WhatsApp: ese número no existe con +{cc}. Fijate dígito por dígito.",
    /** Número incompleto o de más ({cc} código, {want} dígitos que lleva, {have} los que escribió). */
    phoneShort: "Faltan dígitos: un WhatsApp con +{cc} tiene {want} y escribiste {have}.",
    phoneLong: "Sobran dígitos: un WhatsApp con +{cc} tiene {want} y escribiste {have}.",
    /** Argentina: la característica + el número son 10 dígitos (el 9, el 0 y el 15 se acomodan solos). */
    phoneShortAR: "Faltan dígitos: con la característica son 10 (ej. 11 2345-6789) y escribiste {have}.",
    phoneLongAR: "Sobran dígitos: con la característica son 10 (ej. 11 2345-6789), sin el 0 ni el 15.",
  },
  /**
   * Pantalla final. {nombre} = lo que escribió en Nombre.
   * Agenda propia con los horarios libres de Hernán (ghl-booking) en la hora local de la persona; si no carga,
   * el calendario de GHL (site.ts → ghlCalendarUrl) y el WhatsApp (noWa, solo si hay número).
   */
  success: {
    waMessage: "Hola Hernán, soy {nombre}. Completé el formulario y quiero agendar la videollamada.",
    noWa: "¿No te carga el calendario? Escribile a Hernán por WhatsApp al",
    /** Sin calendario ni WhatsApp configurados (modo prueba antes de crear GHL). */
    noCalendar: "Hernán te escribe por WhatsApp para coordinar el día de la videollamada.",
    calendarFrame: "Calendario para agendar tu videollamada con Hernán",
    calendarTz: "Horarios en tu hora local ({zona}).",
    calendarLoading: "Buscando horarios disponibles…",
    calendarDays: "1. Elegí el día",
    calendarSlots: "2. Elegí la hora para {cuando}",
    dayToday: "Hoy",
    dayTomorrow: "Mañana",
    dayNone: "Sin horarios",
    dayNoneLabel: "{fecha}: sin horarios disponibles",
    todayWord: "hoy",
    tomorrowWord: "mañana",
    otherDay: "el {fecha}",
    calendarPick: "Elegí un horario",
    calendarConfirm: "Confirmar: {fecha}",
    calendarBooking: "Agendando…",
    calendarTaken: "Ese horario se acaba de ocupar. Elegí otro, por favor.",
    calendarError: "",
  },
  /**
   * Descarte (P1 = "Regularizar o medir algo ya construido"): no se guarda nada, solo el evento anónimo
   * FormDisqualified { reason: "regularizacion" }. Mensaje amable + WhatsApp (si hay número) + redes. Sin agenda.
   */
  exit: {
    regularizacion: {
      title: "Eso no lo está tomando por ahora.",
      text: "Hoy Hernán se dedica a proyectar casas nuevas, así que no está haciendo regularizaciones ni mediciones de algo ya construido. Si igual querés contarle tu caso, escribile por WhatsApp.",
      waButton: "Escribirle por WhatsApp",
      waMessage: "Hola Hernán, quería consultarte por un caso de algo ya construido.",
    },
    networksTitle: "Mientras tanto, en redes:",
    /** Por si tocó la opción sin querer: vuelve a la primera pregunta. */
    back: "Me equivoqué de opción",
    networks: ["tiktok", "instagram", "facebook", "youtube"] as const,
  },
  /** Sugerencia de email (gmail.con → gmail.com). No bloquea el envío. */
  emailSuggest: "¿Quisiste decir {email}?",
};

/**
 * Página "Llamada agendada" (/llamada-agendada): adonde lleva el formulario después de agendar.
 * El nombre se guarda en la pestaña al agendar (nunca en la URL).
 */
export const booked = {
  metaTitle: `Tu videollamada está casi agendada | ${site.brandFull}`,
  metaDescription: `Mirá el video de ${site.person} antes de tu videollamada.`,
  alert: "Alerta",
  alertDetail: "Falta un paso",
  title: "Tu videollamada está",
  titleMark: "casi agendada",
  lead: "Solo falta un paso:",
  leadMark: "mirá este video",
  when: "Tu videollamada con Hernán: {fecha} ({zona}).",
  play: "Ver el video con sonido",
  videoLabel: `Video de ${site.person} antes de tu videollamada`,
  videoPending: "Video de Hernán [PLACEHOLDER]",
  button: "Hablar con Hernán",
  waMessage: "Hola Hernán, ya agendé mi videollamada y vi tu video.",
  waMessageNamed: "Hola Hernán, soy {nombre}, ya agendé mi videollamada y vi tu video.",
  back: "Volver al inicio",
};

/** Video flotante de Hernán (VideoDock). */
export const videoDock = {
  label: `Video de ${site.person}: por qué tu casa necesita un proyecto`,
  sound: "Activar sonido",
  mute: "Silenciar",
  expand: "Ver el video en grande",
  shrink: "Achicar video",
  close: "Cerrar video",
  pending: "Video de Hernán [PLACEHOLDER]",
};

/** Lightbox (imágenes en grande). */
export const lightbox = {
  open: "Ver en grande",
  close: "Cerrar imagen",
  prev: "Imagen anterior",
  next: "Imagen siguiente",
  cta: "Quiero algo así",
  hint: "Pellizcá para acercar",
};

export const cookies = {
  text: "Usamos cookies solo para medir anuncios.",
  accept: "Aceptar",
  reject: "Rechazar",
  more: "Más info",
};

export const footer = {
  socialTitle: "Seguime",
  followers: "seguidores",
  privacy: "Política de privacidad",
  rights: "Todos los derechos reservados.",
  base: `${site.base.locality}, ${site.base.partido} · ${site.base.region}`,
};

/** Blog (índice y artículos). Los borradores (draft: true) no se publican. */
export const blog = {
  title: `Guías para construir tu casa | ${site.brandFull}`,
  description: "Qué necesitás para construir, cuánto tarda el proyecto, qué pagás aparte y qué mirar antes de comprar el lote. Por Hernán Rotela Báez, Maestro Mayor de Obras.",
  label: "Blog",
  h1: "Guías para construir tu casa",
  empty: "Muy pronto publico las primeras guías.",
  draft: "Borrador · no se publica",
  by: `${site.person}, ${site.professionShort}`,
  cta: "Cotizá tu proyecto",
};

/** Página de política de privacidad (Ley 25.326). Los datos del responsable van en site.ts / [COMPLETAR]. */
export const privacy = {
  title: `Política de privacidad | ${site.brandFull}`,
  description: `Cómo se tratan los datos personales que dejás en la web de ${site.brandFull} (Ley 25.326 de Protección de los Datos Personales).`,
  h1: "Política de privacidad",
  back: "Volver al inicio",
};
