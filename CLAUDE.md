# HABITAR · Rotela Báez — reglas del proyecto

Web de conversión de **Edgar Hernán Rotela Báez, Maestro Mayor de Obras matriculado** (marca HABITAR, base en El Jagüel, Esteban Echeverría). Cliente objetivo: familias que van a construir su casa, sobre todo en **barrio cerrado** (después lote urbano y multifamiliar); segunda línea: planos a distancia para todo el país y el exterior. Tráfico: pauta de Meta y TikTok orgánico. Objetivo: que completen el formulario de calificación → ven el precio de los planos → agendan la videollamada con Hernán. La web también es respaldo de credibilidad (sus redes de Instagram y Facebook están casi vacías).

Misma arquitectura y nombres de archivo que la web de Víctor Oropesa (`franorlandimkt/oropesarq`), para mantener las dos igual. Manual de marca: design system "HABITAR — manual de marca" (claude.ai).

## Stack
- Astro 5, salida 100 % estática. CSS propio con tokens (sin Tailwind). JS solo en `<script>` de componente. Sin librerías de animación.
- Fuentes self-hosted: Archivo variable (ancho 112 % en títulos) + IBM Plex Mono (`@fontsource`).
- Imágenes: `src/assets/img/` + `src/components/ui/Img.astro` (AVIF/WebP, srcset, lazy).
- Deploy: Netlify (`netlify.toml`, `public/_headers`, funciones en `netlify/functions/`). Dominio: `[COMPLETAR]` (`site.ts` → `url`).

## Dónde vive cada cosa
| Qué | Dónde |
|---|---|
| Datos de negocio (precios por etapa, umbral, rangos de m², partidos del radio, stats, redes, WhatsApp, IDs) | `src/data/site.ts` |
| Copy de todas las secciones, del formulario y de las páginas | `src/content/landing.ts` |
| Preguntas del formulario, cálculo del precio (`quoteFor`), radio, teléfono (+54), botón de origen | `src/content/form-steps.ts` |
| Ramas del formulario, Lead / LeadCaliente / Sin terreno, Origen | `src/scripts/lead.ts` |
| Pixel, atribución, cookies, modo prueba | `src/scripts/tracking.ts` (Pixel base en `Base.astro`) |
| WhatsApp en el navegador (libphonenumber) | `src/scripts/phone.ts` |
| JSON-LD | `src/data/schema.ts` |
| Tokens / estilos globales / grilla de celdas | `src/styles/tokens.css` / `global.css` / `grid.css` |
| Primitivas de la carátula (celda, fila, celda CTA, encabezado, cierre de sección, módulo de caso) | `src/components/grid/` (`Cell`, `GridRow`, `CtaCell`, `HeadRow`, `EndRow`, `ProjectModule`) |
| Marco de la home (barra superior, rieles, barra inferior / barra fija del celular) | `src/components/frame/` + `src/scripts/frame.ts` |
| Secciones (orden en `src/pages/index.astro`) | `src/components/sections/NN-Nombre.astro` (`00-Header` queda para blog y privacidad) |
| Formulario pop-up + agenda | `src/components/sections/13-Form.astro` |
| Video del hero (VSL, horizontal 16:9) / lightbox / cookies | `src/components/ui/Vsl.astro` / `Lightbox.astro` / `CookieBanner.astro` |
| Fotos, renders y planos (se detectan por nombre de archivo, sin tocar código) | `src/assets/img/` (nombres en `LEEME.md`) + `src/lib/images.ts` |
| Envío a Sheets + API de conversiones | `netlify/functions/submit-lead.mts` |
| Envío a Go High Level (campos personalizados + webhook) | `netlify/functions/ghl-lead.mts` |
| Agenda (horarios libres y cita en GHL) | `netlify/functions/ghl-booking.mts` |
| Google Sheets (Apps Script) | `integrations/google-sheets/Code.gs` + `README.md` |
| Prueba local sin cuentas (funciones reales + simuladores) | `scripts/local-server.mjs` (`npm run local -- --mocks`) |
| Blog | `src/content/blog/*.md` (`draft: true` = no se publica) |

## Reglas de identidad (no negociables)
- Hernán es **Maestro Mayor de Obras (M.M.O.) matriculado**. NUNCA "arquitecto", "Arq.", "estudio de arquitectura" ni "despacho": ni en copy, ni en meta tags, JSON-LD, `llms.txt`, blog o alt de imágenes.
- **Sin número de matrícula ni colegio** en ningún lado.
- **Solo material propio**: renders, planos y obras donde él es el profesional. Nunca fotos de stock ni trabajos de terceros. Si hay duda, `[CONFIRMAR]` y no se publica. No hay obra 100 % terminada proyectada por él: no escribir "obras terminadas".
- **No prometer lo que no controla**: plazos del municipio (2 a 7 meses), aprobación del barrio, costo de obra.
- **Lo interno no va al repo** (es público): ni la tarifa mínima, ni facturación, ni "obra sin declarar", ni criterios comerciales. Tampoco datos personales de Hernán que no estén en la web.
- No va en la web: regularización, empadronamiento, mediciones, subdivisión, cálculo estructural como servicio aparte (decir "plano de estructura"), instalación de gas, costo de obra por m².

## Reglas de copy
- **Español rioplatense con voseo** en todo (botones, errores, cookies, WhatsApp). Hernán habla en primera persona, directo, con opinión y con datos; el formulario habla de él en tercera ("agendá tu videollamada con Hernán"). Sin emojis.
- Nada de "sueño", "calidad", "compromiso", "excelencia" sin un hecho atrás.
- **Cambiar copy o datos nunca requiere tocar componentes.** Si algo está hardcodeado en un componente, moverlo a `landing.ts` / `site.ts`.
- Datos inventados o pendientes se marcan `// [PLACEHOLDER]`, `// [CONFIRMAR]` o `// [COMPLETAR]` al lado del valor. Lista: `npm run pendientes`.

## Reglas de diseño (manual HABITAR, tema oscuro · v2.0 "la carátula")
- **La página es la carátula de un plano: todo son celdas.** Celdas grafito (`--fondo` `#161616`, secundarias `--superficie`) con radio de 4 px, separadas por un gap (`--gap`: 1 px en el celular, 2 px desde 768) que deja ver `--linea`: esas son las líneas. Grilla de 6 columnas (2 en el celular); desde 1024, rieles a los costados y barras fijas arriba y abajo. Sin sombras, sin tarjetas flotando.
- **Celda = etiqueta mono gris arriba a la izquierda + valor abajo.** Metadatos tipo superíndice en mono (`.sup`: "Casa en Escobar ^255,67 m²"). Las filas de datos de los casos caen debajo de los rótulos de la barra inferior.
- **El CTA es una celda entera en ladrillo** (`CtaCell`, degradé `--g-cta`, texto blanco, flecha de trazo, 48 px mínimo): un `<a>` real con su `data-cta`. **Una sola celda roja por pantalla**: la de la barra superior se apaga sola cuando hay otra a la vista (`frame.ts`). Cada sección termina en una (`EndRow`).
- **Mucho rojo, siempre en degradé**: negro con el ladrillo en degradé (`.cell--glow`, con `--glow-at` / `--glow-size` / `--glow-a`) en el hero, las cifras, las etapas, "¿hay que pagar algo más?", la frase de Quién soy y las celdas "Quiero algo así". Rojo lleno solo en las celdas CTA; a sangre (6 columnas), solo el cierre. Franco lo pidió así: que no quede monocromático. Si dos cosas grandes en rojo compiten en una pantalla, sacá una.
- Datos clave (cifras, número de paso, sección activa) en `--ladrillo-texto` y en mono. Punto ladrillo que late junto a la hora local (quieto con "reducir movimiento").
- **Sin amarillo ni otros colores de apoyo.** El marcador de texto (`.hl`) es tinte ladrillo con texto en tinta.
- Ladrillo puro (`--c-ladrillo`) en texto solo a 24 px o más; texto chico → `--ladrillo-texto`. `--c-hormigon` nunca es texto. Cuerpo mínimo 17 px (le habla a una pareja que invierte en su casa, no a diseñadores).
- Títulos en Archivo ancha (`font-stretch: 112 %`, 700–800); lo técnico (etiquetas, m², medidas, precios) en IBM Plex Mono.
- Ángulos rectos: radios de 2–4 px (8 px solo el pop-up del formulario y el video cuando queda chico en la esquina). Íconos de trazo 1,5 px, esquinas rectas (`Icon.astro`).
- La cota (`.cota`): máximo una por pantalla. Grilla de plano (`.cell--grid`, `.s-grid`): siempre tenue.
- Un solo H1 (hero). H2 por sección (`HeadRow`), H3 adentro. Contraste AA.
- El hero: celda del titular (con la cota) + celda CTA + línea en mono a la izquierda, el video horizontal a la derecha; en el celular, título → video → botón. El botón entra en la primera pantalla en 1280×720 y en 390×844 (también en 375×667).
- Celular: grilla de 2 columnas, sin rieles (su contenido va al pie), barra superior logo + "Precio", barra fija "Calculá el precio de tus planos" después del hero (el aviso de cookies va arriba de ella: `--bar-h`), tiras de renders en carrusel con scroll-snap.
- Animaciones al hacer scroll: solo un fade de 180 ms del contenido de cada celda, nada con "reducir movimiento".
- La web vende una cosa: la videollamada con Hernán. Cada sección termina en un botón al formulario.
- Pocos bloques de texto: lo que se pueda mostrar como lista, línea de tiempo, barra o ficha, no va en párrafo.
- Contadores: el valor final va en el HTML; el JS solo anima. Contenido crítico en HTML estático.
- Nada visual depende del evento `load` (el Pixel en el `<head>` lo demora).
- No agregar schema Review/AggregateRating hasta tener reseñas públicas verificables.

## Reglas del formulario y el tracking (lecciones de Víctor, ver CHANGELOG)
- La validación del navegador y la de las funciones es la MISMA (`form-steps.ts` + `lead.ts`): si no, el Pixel cuenta leads que nunca llegan a Sheets.
- Los campos opcionales (atribución, URLs, cookies, botón, preguntas de intención) nunca rechazan un lead.
- Envío con keepalive + reintentos + sendBeacon + reenvío pendiente; un 400 no se reintenta.
- Todas las llamadas a GHL de un envío entran en 9 s (Netlify corta a los 10 s). Upsert por API antes del webhook.
- Mismo `event_id` en Pixel y API de conversiones. "Rechazar" cookies = sin Pixel y sin CAPI. `?modo=prueba` = sin Pixel ni CAPI.
- Sin Google Analytics ni Microsoft Clarity.

## Comandos
- `npm run dev` · `npm run build` · `npm run preview` · `npm test`
- `npm run build && npm run local -- --mocks` → web + funciones + simuladores de Sheets/GHL/Meta en http://localhost:8788 (`/__mock/state` muestra lo que llegó).
- `npm run placeholders` regenera favicon, íconos, logo PNG y la imagen OG desde los SVG del manual.
- Verificar en 360 / 390 / 768 / 1280 / 1440 px antes de dar por terminado un cambio visual.
- Git: un commit por cambio/sección y una entrada en `CHANGELOG.md` (qué cambió, por qué y qué no cambia).
