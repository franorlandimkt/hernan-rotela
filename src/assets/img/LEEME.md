# Fotos, renders y planos de la web

Subí cada archivo a esta carpeta **con el nombre exacto** de la tabla (`.jpg`, `.png` o `.webp`) y aparece solo en
la web: no hay que tocar código ni copy. Mientras un archivo no está, esa parte se ve sin la foto (nunca rota).

Solo material propio de Hernán: fotos de él, renders, planos y obras donde él es el profesional. Nada de stock ni de
trabajos de terceros. Si hay duda, no se sube.

| Archivo | Dónde aparece | Cómo tiene que ser |
|---|---|---|
| `hernan.jpg` | "Quién soy" (foto grande) | Vertical (4:5), él con los planos de fondo, luz natural. Mínimo 1000 px de ancho. |
| `hernan-llamada.jpg` | Sección de la videollamada (ficha de la llamada) | Horizontal (16:10), de frente, como se lo ve en una videollamada. Mínimo 1000 px de ancho. |
| `hernan-avatar.jpg` | Franja de redes, debajo del hero | Cuadrada, la cara. Mínimo 300 px. |
| `giselle.jpg` | Testimonio (foto de la persona) | Cuadrada. Con su autorización. |
| `testimonio-giselle.jpg` | Testimonio (captura del chat o del audio de WhatsApp) | Captura tal cual, con el número tapado. |
| `proyecto-escobar-1.jpg`, `-2.jpg`, … | Ficha del proyecto de Escobar | Renders o planos de ESE proyecto. La `-1` es la principal. |
| `proyecto-santa-clara-1.jpg`, … | Ficha de Santa Clara | Ídem. |
| `proyecto-san-sebastian-1.jpg`, … | Ficha de San Sebastián | Ídem. |
| `proyecto-sourdeaux-1.jpg`, … | Ficha de Ingeniero Sourdeaux | Ídem. |
| `aprobado-1.jpg`, `aprobado-2.jpg`, … | "Planos municipales aprobados" (carátulas) | Carátula del plano aprobado, con datos personales del cliente tapados. |

Para otro testimonio: se agrega en `src/content/landing.ts → testimonial.items` con una `key` (ej. `sergio`) y las
fotos van como `sergio.jpg` y `testimonio-sergio.jpg`.

Para otro proyecto: se agrega en `landing.ts → projects.items` con una `key` y las imágenes van como
`proyecto-<key>-1.jpg`, `proyecto-<key>-2.jpg`…

El audio del testimonio va en `public/audio/` y se indica en `landing.ts → testimonial.items[].audio`.
El video del hero va en `public/video/` (ver `public/video/LEEME.txt`).

En `npm run dev` los lugares donde falta una foto se ven marcados con el nombre del archivo a subir.
