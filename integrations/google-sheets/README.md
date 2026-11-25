# Google Sheets: leads del formulario

Cada envío del formulario agrega **una fila** en la hoja **Leads**. El camino es:

```
Navegador → Netlify Function submit-lead → Apps Script (este Code.gs) → Google Sheets
```

El navegador nunca habla con Google: la URL del script y el secreto viven solo en las variables de entorno de Netlify.

## Columnas (en este orden)

Fecha y hora (hora de Argentina) · Nombre · WhatsApp (E.164: `+5491123456789`) · Email · **Estado CRM** (lista desplegable) · Tipo de lead (`Con lote` / `Sin terreno`) · Lead caliente (`Sí` / `No`: no busca "solo un plano para el albañil") · ¿Qué quiere proyectar? · ¿Tiene lote? · Provincia · Partido (solo Buenos Aires) · Dentro de 150 km · ¿Dirección de obra? (solo dentro del radio) · m² · Etapas · Precio que vio (ej. `USD 8.000 – USD 11.500`) · ¿Cuándo arranca? · ¿Quién decide? · Botón de origen (desde qué botón abrió el formulario; lista en `src/content/form-steps.ts` → `CTA_ORIGINS`) · Origen · utm_source · utm_medium · Campaña (utm_campaign) · Conjunto (utm_term) · Anuncio (utm_content) · campaign_id · adset_id · ad_id · Ubicación (placement) · fbclid · URL de entrada · Referrer · Dispositivo · Cookies aceptadas · event_id · Notas

- **Estado CRM** entra como `Nuevo` (con lote o comprándolo), `Sin terreno` (todavía lo está buscando) o `Prueba` (página abierta con `?modo=prueba`). La lista desplegable tiene además `Contactado`, `Videollamada agendada`, `Cotizado`, `Ganado` y `Perdido` para que el equipo lo mueva a mano (se pueden escribir otros valores: la lista avisa pero no bloquea).
- **Origen**: primero se mira `utm_medium`. `paid` → `Pauta Meta`; `bio` → `Bio TikTok` / `Bio Instagram` / `Bio Facebook` (según `utm_source`); otro caso con algún `utm_*` o ID de anuncio → `Pauta Meta`; nada → `Orgánico / directo`.
  - Link para la bio de TikTok: `https://<dominio>/?utm_source=tiktok&utm_medium=bio`
  - Instagram: `?utm_source=instagram&utm_medium=bio` · Facebook: `?utm_source=facebook&utm_medium=bio`
  - Pauta de Meta (parámetros de URL del anuncio): `utm_source=facebook&utm_medium=paid&utm_campaign={{campaign.name}}&utm_term={{adset.name}}&utm_content={{ad.name}}&campaign_id={{campaign.id}}&adset_id={{adset.id}}&ad_id={{ad.id}}&placement={{placement}}`
- **Sin duplicados**: si llega otra vez un lead con el mismo `event_id` (reintento o reenvío), el script no agrega otra fila.
- **Encabezados faltantes**: el script agrega solo, al final de la fila 1, cualquier encabezado de `HEADERS` que falte y cualquier dato que llegue con un nombre de columna que la hoja no tiene.
- Si un texto empieza con `=`, `+`, `-` o `@` se guarda con un apóstrofo adelante (anti-inyección de fórmulas; por eso el WhatsApp se ve como texto).
- El script escribe por **nombre de encabezado**: podés mover columnas, cambiar anchos o agregar columnas tuyas. No cambies el texto de los encabezados.

## Paso a paso (una sola vez, ~10 minutos)

### 1. Crear la hoja y pegar el script
1. En Google Drive creá una hoja de cálculo nueva, por ejemplo **"Leads HABITAR"**.
2. Menú **Extensiones → Apps Script**.
3. Borrá todo el código que aparece en `Código.gs` y pegá el contenido completo de [`Code.gs`](Code.gs). Guardá (ícono de disquete o `Ctrl/Cmd + S`).

### 2. Crear la hoja "Leads" y el secreto (un clic)
1. En el editor, arriba, revisá que la lista de funciones diga **`setup`** (es la primera del archivo, se elige sola; si dice `doPost`, cambiala) y tocá **▶ Ejecutar**.
2. Google pide permisos: **Revisar permisos → tu cuenta → Configuración avanzada → Ir a (nombre del proyecto) (no seguro) → Permitir**. Es tu propio script; el aviso sale siempre con scripts propios.
3. Abajo se abre el **Registro de ejecución**. La última línea es el **secreto** (64 letras y números). Copialo: va en Netlify (paso 4).
   - ¿No aparece? Está en **⚙ Configuración del proyecto → Propiedades de la secuencia de comandos** (`SHEETS_SECRET`).

### 3. Desplegar como aplicación web
1. Arriba a la derecha: **Implementar → Nueva implementación**.
2. Engranaje junto a "Seleccionar tipo" → **Aplicación web**.
3. Descripción: `Leads web` · Ejecutar como: **Yo** · Quién tiene acceso: **Cualquier usuario** (necesario para que Netlify pueda llamarlo; sin el secreto el script rechaza todo y nadie puede leer la hoja con esa URL).
4. **Implementar** y copiá la **URL de la aplicación web** (termina en `/exec`).
5. Prueba: abrí esa URL en el navegador. Tiene que decir `{"ok":true,"service":"Leads HABITAR"}`.

### 4. Cargar las variables en Netlify
Netlify → el sitio → **Site configuration → Environment variables → Add a variable**:

| Variable | Valor |
|---|---|
| `SHEETS_WEBHOOK_URL` | la URL `/exec` del paso 3 |
| `SHEETS_SECRET` | el secreto que mostró `setup` en el paso 2 |

Después: **Deploys → Trigger deploy → Deploy site**. Probá: `https://<sitio>/.netlify/functions/submit-lead?diagnostico=1&prueba=1` → tiene que decir que el secreto coincide y escribir una fila "PRUEBA" (borrala después).

## Si cambiás el código del script (misma URL)
1. Hoja → **Extensiones → Apps Script** → seleccioná todo en `Código.gs`, borralo y pegá el [`Code.gs`](Code.gs) nuevo. Guardá.
2. **Implementar → Administrar implementaciones** → la activa → **✏️ Editar** → Versión: **Nueva versión** → **Implementar**. La URL `/exec` es la misma: no hay que tocar Netlify.

Si en lugar de editar creás una implementación *nueva*, la URL cambia y hay que actualizar `SHEETS_WEBHOOK_URL` en Netlify.

## Si no llegan filas
- **Diagnóstico (no escribe nada):** `https://<sitio>/.netlify/functions/submit-lead?diagnostico=1` dice qué variables faltan, si Apps Script responde y si el secreto coincide. Con `&prueba=1` además escribe una fila "PRUEBA".
- Netlify → **Logs → Functions → submit-lead**: `[submit-lead] Sheets: …`.
  - `unauthorized` → el secreto de Netlify y el de `SHEETS_SECRET` no coinciden.
  - `sin configurar` → falta una variable (o no se redeployó después de cargarla).
  - HTML en lugar de JSON → la implementación no está con acceso "Cualquier usuario".
- Un lead que no se pudo guardar queda completo en el log con la línea `[submit-lead] LEAD NO GUARDADO`: copialo a la hoja a mano.
- En Apps Script → **Ejecuciones** se ve cada llamada a `doPost` y su error, si lo hubo.
