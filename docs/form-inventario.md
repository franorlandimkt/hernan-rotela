# Inventario del formulario (v1.0)

Todo lo de esta lista tiene que seguir igual después de cualquier cambio de diseño o de copy: mismo evento, mismo momento, mismos parámetros, mismos campos y valores. Archivos: `src/components/sections/13-Form.astro` (pantallas y script), `src/scripts/tracking.ts`, `src/scripts/lead.ts`, `src/content/form-steps.ts`, `netlify/functions/*`. Prueba: `npm run build && npm run local -- --mocks` y `/__mock/state`.

## 1. Lead del Pixel + API de conversiones (deduplicación)
- **Cuándo:** al tocar "Sí, es correcto" en "¿Este es tu WhatsApp?", una sola vez por página.
- **Qué (navegador):** con lote → `fbq("track", "Lead", {}, { eventID })` y, si no busca "solo un plano para el albañil", `fbq("trackCustom", "LeadCaliente", {}, { eventID: eventID + "-hot" })`. Sin lote → `fbq("trackCustom", "LeadSinTerreno", {}, { eventID })`.
- **CAPI (`submit-lead`):** los mismos nombres y event_id, con em, ph, fn, ln, country (por el código del WhatsApp), IP, user agent, fbp, fbc (armado con fbclid si no hay cookie) y custom_data (tipo_proyecto, tiene_lote, provincia, partido, dentro_radio, m2, etapas, etapa_clave, precio_estimado, cuando_arranca, quien_decide, boton_origen).
- **No se manda:** en modo prueba (`?modo=prueba`), con honeypot lleno, sin ID de Pixel en `site.ts`, o (solo CAPI) si rechazó cookies.

## 2. Otros eventos (Pixel, una vez por sesión, nunca en modo prueba)
| Evento | Cuándo | Parámetros |
|---|---|---|
| `FormStart` (custom) | primera interacción con el formulario | — |
| `FormStep` (custom) | al avanzar de cada pregunta | `step` (número fijo, `STEP_NUMBER`), `step_name` (id) |
| `FormDisqualified` (custom) | "Regularizar o medir algo ya construido" | `reason: "regularizacion"` |
| `CotizacionVista` (custom, event_id nuevo) | al mostrarse el precio | `m2`, `etapas` |
| `ClickAgendar` (custom) | primer horario elegido | — |
| `Schedule` (estándar, event_id nuevo) | cita creada OK | — |
| `ClickWhatsApp` (custom) | primer toque a un botón de WhatsApp | — |

## 3. Cuerpo del envío (mismo a `submit-lead` y `ghl-lead`)
`tipo, terreno, provincia, partido, direccion, m2, etapas, cuando, decide` (pasadas por `cleanAnswers`), `nombre, email, pais_codigo, whatsapp_num, hr_k9` (honeypot), `modelo` (clave de `CTA_ORIGINS`), `event_id`, `utm_source, utm_medium, utm_campaign, utm_term, utm_content, campaign_id, adset_id, ad_id, placement, fbclid, fbclid_ts, landing_url, referrer, event_source_url`, `consent`, `fbp`, `fbc`, `prueba`, `ts`, `consentimiento_whatsapp`. `Content-Type: text/plain` (sin preflight), keepalive, hasta 3 intentos, sendBeacon al salir, pendientes en `hr_lead_pendiente` / `hr_ghl_pendiente` (reenvío en la próxima visita, mismo event_id). Un 4xx no se reintenta.

## 4. Go High Level (`ghl-lead`)
- Pasos: 1) `/contacts/upsert` con cada dato en el campo personalizado cuya clave (`contact.{clave}`) o nombre coincide; 2) webhook `GHL_WEBHOOK_URL`. Todo en 9 s.
- **Payload (claves exactas):** nombre, nombre_pila, apellido, email, whatsapp (E.164), tipo_proyecto, tiene_lote, provincia, partido, dentro_radio, direccion_obra, m2, etapas, precio_estimado, cuando_arranca, quien_decide, califica, lead_caliente, tipo_lead ("Con lote" / "Sin terreno"), utm_source, utm_medium, utm_campaign, utm_content, utm_term, campaign_id, adset_id, ad_id, placement, fbclid, origen, boton_origen, url_pagina, url_entrada, referrer, dispositivo, ubicacion_ip, pais_whatsapp, fecha, fbp, fbc, consentimiento_whatsapp, consentimiento_fecha_hora (hora de Argentina, -03:00), cookies_aceptadas, event_id, resumen, test.
- Agenda (`ghl-booking`): además `hora_llamada_local` (campo personalizado), `timezone` y `country` (campos estándar), antes de crear la cita.

## 5. Sheets (`submit-lead` → `Code.gs`)
Columnas en `integrations/google-sheets/README.md`. Estado CRM: `Nuevo` (con lote), `Sin terreno`, `Prueba`.

## 6. Agenda
GET `ghl-booking?tz=` → días y horarios en la hora local. Elegir horario → `ClickAgendar`. "Confirmar" → POST → 409 = ocupado (recarga; a la segunda, respaldo). OK → `Schedule`, `hr_nombre` en la pestaña (nunca en la URL) y `/llamada-agendada?cuando=<ISO>&tz=<zona>`. Respaldo si falla: iframe del calendario de GHL con datos precargados → WhatsApp (si hay número) → "Hernán te escribe por WhatsApp…".

## 7. Reglas y pantallas
- Ramas: partido solo con Buenos Aires; dirección de obra solo dentro del radio; "completo" solo dentro del radio (`etapasFor`).
- "Tus datos": nombre sin números (si pega el teléfono lo pasa al WhatsApp), WhatsApp por país (+54: 9 agregado, 0 y 15 sacados), email con sugerencia, honeypot, "¿Este es tu WhatsApp?" (ignora doble toque el primer medio segundo).
- Al cerrar en "Tus datos": "Te falta solo un paso para ver el precio de tus planos" (Completar / Salir igual).
- Avance en sessionStorage (`hr_form_estado`); se borra al enviar o al quedar descartado.
- Eventos entre componentes: `hr:form-open` / `hr:form-close` (el video se pausa y se oculta) y `hr:open-form` (lightbox → formulario con origen "render").
