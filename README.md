# HABITAR · Rotela Báez — web de conversión

Web estática en **Astro 5** de Hernán Rotela Báez, Maestro Mayor de Obras matriculado (El Jagüel, Esteban Echeverría). Vende el proyecto de casas (sobre todo en barrios cerrados) en tres etapas, con plano municipal y dirección de obra hasta 150 km, y planos a distancia para todo el país. Lleva al formulario de calificación → precio de los planos en pantalla → videollamada agendada con Hernán.

Funciones de Netlify: `submit-lead` (Google Sheets + API de conversiones de Meta), `ghl-lead` (Go High Level) y `ghl-booking` (agenda).

- Reglas para futuras sesiones con Claude Code: [`CLAUDE.md`](CLAUDE.md) · Cambios: [`CHANGELOG.md`](CHANGELOG.md) · Qué no puede cambiar del formulario: [`docs/form-inventario.md`](docs/form-inventario.md)
- Cuentas, IDs y campos que hay que crear (Netlify, Sheets, Meta, GHL) y la prueba completa: [`docs/cuentas-a-crear.md`](docs/cuentas-a-crear.md)
- Misma arquitectura que la web de Víctor Oropesa (`franorlandimkt/oropesarq`).

## Arrancar

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # genera dist/
npm test           # precio, teléfono y reglas del lead
```

Requiere Node 18.17+ o 20.3+.

---

## 1. Cómo editar datos y textos

| Quiero cambiar… | Archivo |
|---|---|
| Precios por etapa, umbral de 250 m², rangos de m², partidos dentro del radio, stats, redes, WhatsApp, email, IDs (Pixel, GHL) | `src/data/site.ts` |
| Cualquier texto de la página, del formulario o del aviso de cookies | `src/content/landing.ts` |
| Preguntas y opciones del formulario | `src/content/form-steps.ts` |
| Colores, tipografías, espaciados | `src/styles/tokens.css` |
| Orden de las secciones u ocultar una | `src/pages/index.astro` |
| Fotos y renders | `src/assets/img/` (punto 3) |

Los datos se escriben **una sola vez** en `site.ts` y se reflejan en la página, el JSON-LD, `llms.txt`, el formulario y las funciones. Las opciones del formulario viven solo en `form-steps.ts`: las funciones las importan para validar.

### Precio del formulario
`site.ts → pricing`: USD por m² de cada etapa hasta `threshold` (250 m²) y `extra` para los m² de más; `sizeBounds` = bordes de los rangos ([150, 200, 300]). El precio se calcula en los bordes: "Menos de 150 m²" → "hasta USD X", "Más de 300 m²" → "desde USD X". Valores de control en `tests/pricing.test.ts` (completo 150 m² = USD 6.000 · 200 = 8.000 · 250 = 10.000 · 300 = 11.500; ante + ejecutivo 300 = 8.500; solo ante 300 = 4.250).

---

## 2. Pendientes (`[COMPLETAR]` / `[CONFIRMAR]` / `[PLACEHOLDER]`)

```bash
npm run pendientes
```

- `[COMPLETAR]`: dato que todavía no existe (dominio, WhatsApp, email, IDs de Pixel y GHL, URLs de redes, videos). La web funciona sin él.
- `[CONFIRMAR]`: viene del brief o es una estimación; validar con Hernán.
- `[PLACEHOLDER]`: material pendiente; no se publica hasta reemplazarlo (los bloques sin material no se muestran).

---

## 3. Fotos, renders y videos

**Solo material propio de Hernán** (renders, planos, obras donde él es el profesional). Nunca fotos de stock ni de terceros.

1. Exportá la imagen en JPG o PNG (mínimo 1600 px de ancho) a `src/assets/img/` (ej. `proyecto-escobar-1.jpg`).
2. Agregala en `landing.ts`: renders de un proyecto en `projects.items[].images` (`{ name: "proyecto-escobar-1", alt: "…" }`), carátulas aprobadas en `projects.approved.images`, foto de Hernán en `about.photo`.
3. `npm run build`: Astro genera AVIF + WebP. Tocar la imagen la abre en grande; "Quiero algo así" abre el formulario.

Videos: ver `public/video/LEEME.txt` (VSL `hernan.mp4` y `confirmacion.mp4`; rutas en `site.ts → video` y `bookedVideo`). Logo: SVG del manual en `public/brand/`; `npm run placeholders` regenera los PNG y la imagen OG.

---

## 4. Deploy (Netlify)

`netlify.toml` ya configura todo: build `npm run build`, publish `dist`, funciones `netlify/functions` (esbuild). Después de crear o cambiar una variable: **Deploys → Trigger deploy → Deploy site**. Al tener dominio, actualizá `site.ts → url` (canonical, sitemap, JSON-LD y OG dependen de ese valor).

---

## 5. Formulario → Sheets + Meta + Go High Level

Flujo de un envío:

1. Al entrar a cualquier página se guarda la atribución first-touch (`utm_*`, `campaign_id`, `adset_id`, `ad_id`, `placement`, `fbclid`, URL de entrada y referrer) en la pestaña y 30 días en el teléfono, con respaldo en memoria. Al enviar se lee también la URL actual: nunca llega vacía. `fbc` se arma desde `fbclid` si no hay cookie (`fb.1.{ms}.{fbclid}`).
2. El formulario pregunta: qué quiere proyectar (regularización → descarte amable con WhatsApp, `FormDisqualified {reason:"regularizacion"}`), si tiene lote, provincia, partido (solo Buenos Aires), dirección de obra (solo dentro del radio), m², etapas (el servicio completo solo dentro del radio), cuándo arranca y quién decide; después "Tus datos" y "¿Este es tu WhatsApp?".
3. Al confirmar, un `event_id`: Pixel `Lead` (+ `LeadCaliente` si no busca "solo un plano para el albañil") o `LeadSinTerreno` (sin lote), y el mismo cuerpo a `submit-lead` y `ghl-lead` (keepalive, reintentos, sendBeacon al salir y reenvío pendiente en la próxima visita).
4. `submit-lead` valida con las mismas reglas que el navegador, escribe la fila en Sheets y manda los mismos eventos a la API de conversiones (mismo `event_id`). Responde OK solo si Sheets guardó.
5. `ghl-lead` crea o actualiza el contacto por la API con cada dato en su **campo personalizado** y después llama al webhook del workflow.
6. "Calculando…" → precio de los planos (`CotizacionVista`) → con lote, la agenda (`ClickAgendar`, `Schedule`) → `/llamada-agendada`. Sin lote, precio + invitación a agendar cuando tenga el lote + redes.

**Modo prueba:** `?modo=prueba` en la URL → fila con Estado CRM "Prueba", `test=true` en GHL, cita con "[PRUEBA]", sin Pixel ni API de conversiones.

**Cookies:** el Pixel carga de entrada; "Rechazar" lo revoca (también en las visitas siguientes) y la función no manda ese lead a Meta.

### Variables de entorno (Netlify → Site configuration → Environment variables)

| Variable | Obligatoria | Qué es |
|---|---|---|
| `SHEETS_WEBHOOK_URL` | Sí | URL `/exec` de la aplicación web de Apps Script ([`integrations/google-sheets/README.md`](integrations/google-sheets/README.md)). |
| `SHEETS_SECRET` | Sí | El secreto que muestra `setup()` en Apps Script. Va en el cuerpo del POST, nunca en la URL. |
| `META_CAPI_TOKEN` | Sí (con Pixel) | Token de la API de conversiones: Administrador de eventos → el Pixel → Configuración → API de conversiones → Generar token de acceso. El ID del Pixel va en `site.ts → metaPixelId`. |
| `META_TEST_EVENT_CODE` | Solo para probar | Código de **Probar eventos** (ej. `TEST12345`). Mientras exista, los eventos del servidor van a esa pestaña. **Borrala al terminar.** |
| `GHL_API_TOKEN` | Sí (GHL) | Private Integration de la subcuenta (Settings → Private Integrations) con **View/Edit Contacts, View Custom Fields, View Calendars, View/Edit Calendar Events**. Marcar como secreto. |
| `GHL_LOCATION_ID` | Sí (GHL) | Location ID de la subcuenta (Settings → Business Profile). |
| `GHL_WEBHOOK_URL` | Sí (GHL) | URL del webhook entrante del workflow (Automation → Workflows → disparador **Inbound Webhook**). |
| `GHL_CALENDAR_ID` | No | Opcional: gana sobre `site.ts → ghlCalendarId`. |

Ninguna va en el código ni en el repo. Sin estas variables la web funciona igual: el formulario muestra el precio y la agenda cae al respaldo (widget de GHL, WhatsApp o el aviso de que Hernán escribe).

**Diagnósticos** (en el navegador, no escriben nada):
- `/.netlify/functions/submit-lead?diagnostico=1` → variables, Pixel, si Apps Script responde y si el secreto coincide (`&prueba=1` escribe una fila "PRUEBA").
- `/.netlify/functions/ghl-lead?diagnostico=1` → qué dato va a qué campo personalizado de GHL y cuáles faltan.
- `/.netlify/functions/ghl-booking?diagnostico=1` → si GHL devuelve horarios del calendario.

Errores: Netlify → **Logs → Functions**. Un lead que no se pudo guardar queda completo en el log (`LEAD NO GUARDADO` / `NO LLEGÓ A GHL`).

### Links con UTM para las bios
- TikTok: `https://<dominio>/?utm_source=tiktok&utm_medium=bio`
- Instagram: `?utm_source=instagram&utm_medium=bio` · Facebook: `?utm_source=facebook&utm_medium=bio`
- Pauta de Meta (parámetros de URL del anuncio): `utm_source=facebook&utm_medium=paid&utm_campaign={{campaign.name}}&utm_term={{adset.name}}&utm_content={{ad.name}}&campaign_id={{campaign.id}}&adset_id={{adset.id}}&ad_id={{ad.id}}&placement={{placement}}`

---

## 6. Probar sin cuentas

```bash
npm run build
npm run local -- --mocks      # http://localhost:8788
```

Sirve la web compilada y corre las funciones **reales**, con simuladores de Apps Script (ejecuta el `Code.gs` real sobre una planilla en memoria), la API y el webhook de GHL y la API de conversiones. `http://localhost:8788/__mock/state` muestra las filas, contactos, citas, webhooks y eventos que llegaron. Sin `--mocks`, las funciones corren sin variables (como Netlify hoy). `--ghl-down` simula GHL caído.

---

## 7. SEO e IAs

- JSON-LD (`src/data/schema.ts`): ProfessionalService/LocalBusiness + Person + Service (etapas) + FAQPage + HowTo + WebSite + WebPage. Sin precios ni reseñas.
- `/llms.txt` y `robots.txt` (con bots de IA) se generan desde `site.ts` y el copy. Sitemap automático (sin `/llamada-agendada`).
- Blog: `src/content/blog/*.md`. Con `draft: true` no se publica (solo se ve con `npm run dev`). Para publicar: `draft: false` y sacar `"/blog"` del filtro del sitemap en `astro.config.ts` (el índice está afuera mientras no haya artículos publicados).

---

## 8. Estructura

```
src/
  data/site.ts            datos del negocio (única fuente)
  data/schema.ts          JSON-LD
  content/landing.ts      copy de todas las secciones
  content/form-steps.ts   preguntas, precio, radio, teléfono
  content/blog/           artículos (markdown)
  components/sections/    00-Header … 14-Footer (una sección por archivo; 13-Form = formulario)
  components/ui/          Logo, Img, Rótulo, CTA, VideoDock, Lightbox, cookies
  components/illustrations/Icon.astro   íconos de trazo
  scripts/                main.ts, tracking.ts, lead.ts, phone.ts
  styles/                 tokens.css, global.css
  pages/                  index, llamada-agendada, politica-de-privacidad, blog, robots.txt, llms.txt
netlify/functions/        submit-lead, ghl-lead, ghl-booking
integrations/google-sheets/   Code.gs + pasos
scripts/                  local-server.mjs (prueba local), placeholders.mjs (PNG de marca y OG)
tests/                    vitest
```
