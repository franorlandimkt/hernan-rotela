# Fotos, renders y planos de la web

Subí cada archivo a esta carpeta **con el nombre exacto** de la tabla (`.jpg`, `.png` o `.webp`) y aparece solo en
la web: no hay que tocar código ni copy. Mientras un archivo no está, esa parte se ve sin la foto (nunca rota).

Solo material propio de Hernán: fotos de él, renders, planos y obras donde él es el profesional. Nada de stock ni de
trabajos de terceros. Si hay duda, no se sube.

| Archivo | Dónde aparece | Cómo tiene que ser |
|---|---|---|
| `hernan.jpg` | "Quién soy" (celda de la foto) | Vertical (4:5), él con los planos de fondo, luz natural. Mínimo 800 px de ancho. |
| `hernan-llamada.jpg` | (Fuera de la home desde v2.0) | Horizontal (16:10). |
| `hernan-avatar.jpg` | (Fuera de la home desde v2.0) | Cuadrada, la cara. |
| `giselle.jpg` | Testimonio (foto de la persona) | Cuadrada. Con su autorización. |
| `testimonio-giselle.jpg` | Testimonio (captura del chat o del audio de WhatsApp) | Captura tal cual, con el número tapado. |
| `proyecto-escobar-1.jpg` … `-5.jpg` | Tira del caso de Escobar (5 celdas + "Quiero algo así") | Renders o planos de ESE proyecto, verticales 4:5 (mínimo 800 px de ancho). Sin ninguna, la tira no se muestra. |
| `proyecto-santa-clara-1.jpg`, … | Ficha de Santa Clara | Ídem. |
| `proyecto-san-sebastian-1.jpg`, … | Ficha de San Sebastián | Ídem. |
| `proyecto-sourdeaux-1.jpg`, … | Ficha de Ingeniero Sourdeaux | Ídem. |
| `aprobado-1.jpg`, `aprobado-2.jpg`, … | (Fuera de la home desde v2.0) | Carátula del plano aprobado, con datos personales del cliente tapados. |

Para otro testimonio: se agrega en `src/content/landing.ts → testimonial.items` con una `key` (ej. `sergio`) y las
fotos van como `sergio.jpg` y `testimonio-sergio.jpg`.

Para otro proyecto: se agrega en `landing.ts → projects.items` con una `key` y las imágenes van como
`proyecto-<key>-1.jpg`, `proyecto-<key>-2.jpg`…

El audio del testimonio va en `public/audio/` y se indica en `landing.ts → testimonial.items[].audio`.
El video del hero va en `public/video/` (ver `public/video/LEEME.txt`).

En `npm run dev` los lugares donde falta una foto se ven marcados con el nombre del archivo a subir.
