# Lo que hay que crear para la prueba completa

Nada de esto existe todavía. La web funciona sin ello en modo prueba (`?modo=prueba`). Cuando esté todo, se carga y se prueba de punta a punta (punto 7). Ningún token ni secreto va al repo (es público): todo va en las variables de Netlify.

## 1. Sitio en Netlify
- Conectar el repo `franorlandimkt/hernan-rotela` (rama `main` cuando se mergee). Build y funciones ya están en `netlify.toml`.
- Subdominio sugerido: `habitar-rotela.netlify.app` (es el que está en `site.ts → url` mientras no haya dominio; si queda otro, cambiarlo ahí).

## 2. Dominio
- Comprarlo y apuntarlo a Netlify (Domain management → Add domain). Después, `site.ts → url` = `https://<dominio>`.

## 3. Google Sheets
- Planilla nueva "Leads HABITAR" + Apps Script con `integrations/google-sheets/Code.gs` → `setup()` → implementar como aplicación web (pasos en `integrations/google-sheets/README.md`).
- Variables de Netlify: `SHEETS_WEBHOOK_URL` y `SHEETS_SECRET`.

## 4. Meta
- Pixel (conjunto de datos) en el Business Manager de Hernán → el ID va en `site.ts → metaPixelId`.
- Token de la API de conversiones (Administrador de eventos → Configuración → API de conversiones) → `META_CAPI_TOKEN`.
- Para probar: código de "Probar eventos" → `META_TEST_EVENT_CODE` (borrarla después).
- Eventos personalizados que va a recibir: `LeadCaliente`, `LeadSinTerreno`, `CotizacionVista`, `ClickAgendar`, `ClickWhatsApp`, `FormStart`, `FormStep`, `FormDisqualified`. Estándar: `PageView`, `Lead`, `Schedule`. Sugerencia: conversiones personalizadas para `LeadCaliente` (optimizar la pauta) y `LeadSinTerreno` (audiencia de nutrición).

## 5. Go High Level (subcuenta de Hernán)
- **Private Integration** (Settings → Private Integrations) con: View/Edit Contacts, **View Custom Fields**, View Calendars, View/Edit Calendar Events → `GHL_API_TOKEN`. **Location ID** (Settings → Business Profile) → `GHL_LOCATION_ID`.
- **Calendario** de la videollamada (duración en `site.ts → call.minutes`, hoy 30 min, zona horaria de Argentina) → el ID va en `site.ts → ghlCalendarId` y el link de booking (respaldo) en `site.ts → ghlCalendarUrl`.
- **Workflow** con disparador **Inbound Webhook** → su URL en `GHL_WEBHOOK_URL`. Mandar el primer lead de prueba, mapear el payload y armar las ramas (ej. `tipo_lead` = "Con lote" / "Sin terreno", `lead_caliente`, `test`).
- **External Tracking** (Settings → External Tracking) → el ID en `site.ts → ghlTrackingId` (opcional; si duplica contactos, dejarlo vacío).
- **Campos personalizados de contacto** (tipo **Texto** salvo `resumen`, que va como **Texto largo**). Crear cada uno con el **nombre igual a la clave** (GHL arma la clave `contact.<nombre>`); la función los encuentra por clave o por nombre. Diagnóstico: `/.netlify/functions/ghl-lead?diagnostico=1` lista cuáles faltan.

| Grupo | Claves |
|---|---|
| Respuestas | `tipo_proyecto`, `tiene_lote`, `provincia`, `partido`, `dentro_radio`, `direccion_obra`, `m2`, `etapas`, `precio_estimado`, `cuando_arranca`, `quien_decide` |
| Calificación | `califica`, `lead_caliente`, `tipo_lead`, `test` |
| Atribución | `origen`, `boton_origen`, `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`, `campaign_id`, `adset_id`, `ad_id`, `placement`, `fbclid`, `url_pagina`, `url_entrada`, `referrer` |
| Meta | `fbp`, `fbc`, `event_id`, `cookies_aceptadas` |
| Contexto | `dispositivo`, `ubicacion_ip`, `pais_whatsapp`, `fecha`, `consentimiento_whatsapp`, `consentimiento_fecha_hora`, `resumen` (texto largo) |
| Agenda | `hora_llamada_local` |

(42 campos. Los booleanos llegan como `true`/`false`; si preferís casilla de verificación, la función también lo acepta.)

## 6. Datos que faltan en `site.ts`
`whatsapp` / `whatsappDisplay`, `email`, URLs y handles de TikTok, Instagram, Facebook (y YouTube si tiene), `video.src` y `bookedVideo.src` (archivos en `public/video/`, ver `LEEME.txt`).

## 7. Prueba completa (cuando esté todo)
1. `/.netlify/functions/submit-lead?diagnostico=1&prueba=1` → secreto OK y fila "PRUEBA".
2. `/.netlify/functions/ghl-lead?diagnostico=1` → 42 de 42 campos.
3. `/.netlify/functions/ghl-booking?diagnostico=1` → horarios libres.
4. Con `META_TEST_EVENT_CODE` cargada: completar el formulario SIN `?modo=prueba` (modo prueba no manda a Meta) → ver Lead + LeadCaliente del navegador y del servidor deduplicados en "Probar eventos".
5. Completar con `?modo=prueba` → fila "Prueba", contacto con `test=true` y cita "[PRUEBA]" (borrarla).
6. Borrar `META_TEST_EVENT_CODE` y hacer Trigger deploy.
