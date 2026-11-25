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
| Tokens / estilos globales | `src/styles/tokens.css` / `global.css` |
| Secciones (orden en `src/pages/index.astro`) | `src/components/sections/NN-Nombre.astro` |
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

## Reglas de diseño (manual HABITAR)
- Proporción **60 hueso · 30 grafito · 10 ladrillo**. El ladrillo marca: un botón por pantalla, la cota, un dato. Si hay dos cosas en ladrillo compitiendo, una sobra.
- Ladrillo puro (`--c-ladrillo`) en texto solo a 24 px o más; texto chico → `--ladrillo-texto`. `--c-hormigon` nunca es texto.
- Títulos en Archivo ancha (`font-stretch: 112 %`, 700–800); lo técnico (etiquetas, m², medidas, precios) en IBM Plex Mono.
- Ángulos rectos: radios de 2–4 px (8 px solo el pop-up del formulario y el video cuando queda chico en la esquina). Íconos de trazo 1,5 px, esquinas rectas (`Icon.astro`).
- La cota (`.cota`): máximo una por pantalla. Grilla de plano (`.s-grid`): siempre tenue.
- Un solo H1 (hero). H2 por sección, H3 adentro. Contraste AA.
- El hero va en grafito y centrado: título → video horizontal → botón. El botón tiene que verse en la primera pantalla del celular.
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
