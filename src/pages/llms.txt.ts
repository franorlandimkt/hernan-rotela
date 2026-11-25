import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { site, socialList, fmt } from "../data/site";
import { stages, process, faq, costs } from "../content/landing";

// /llms.txt — resumen en markdown para IAs (GEO/AEO). Se genera desde site.ts y el copy: mismo nombre,
// título y datos que la web y el JSON-LD (consistencia de entidad). Siempre "Maestro Mayor de Obras" (ver CLAUDE.md, reglas de identidad).
// Nada interno (tarifa mínima, facturación, criterios comerciales) va acá.
export const GET: APIRoute = async () => {
  const posts = (await getCollection("blog")).filter((p) => !p.data.draft).sort((a, b) => +b.data.pubDate - +a.data.pubDate);
  const nets = socialList();
  const md = `# ${site.brandFull}

> ${site.person} es ${site.credential}. Trabaja desde ${site.base.locality}, ${site.base.partido} (${site.base.regionLabel}, provincia de ${site.base.region}, Argentina). Hace el proyecto de viviendas unifamiliares y multifamiliares en tres etapas (anteproyecto, proyecto ejecutivo y plano municipal con tramitación) y dirección de obra, sobre todo de casas en barrios cerrados. El plano municipal y la dirección de obra, hasta ${site.radiusKm} km de ${site.base.locality}; el anteproyecto y el proyecto ejecutivo, a distancia para todo el país y el exterior.

## Datos clave
- Profesional: ${site.person}, ${site.credential}
- Marca: ${site.brandFull}
- Base: ${site.base.locality}, ${site.base.partido}, ${site.base.region}, Argentina
- Más de ${site.stats.yearsOnSite} años en obra (albañilería, electricidad, durlock, capataz) y más de ${site.stats.yearsProjects} años haciendo proyectos
- Más de ${fmt(site.stats.m2Approved)} m² de casas aprobadas en municipios
- Zona con plano municipal y dirección de obra: hasta ${site.radiusKm} km de ${site.base.locality} (CABA y GBA)
- Planos a distancia (sin plano municipal): todo el país y el exterior
- Medios de pago: ${site.payments.join(", ")}

## Etapas del servicio
${stages.items.map((s) => `### ${s.title}\n${s.text}\n${s.list.map((l) => `- ${l}`).join("\n")}\n- Plazo: ${s.time}${s.note ? `\n- ${s.note}` : ""}`).join("\n\n")}

### ${stages.extra.title} (opcional)
${stages.extra.text}

## Gastos aparte de los honorarios (solo con plano municipal)
${site.extraCosts.map((c) => `- ${c}`).join("\n")}
${costs.extraNote}

## Cómo trabaja
${process.steps.map((s, i) => `${i + 1}. ${s.title}: ${s.text} (${s.time})`).join("\n")}

Cotización (el formulario muestra el precio de los planos en pantalla): ${site.url}/#cotiza

## Preguntas frecuentes
${faq.items.map((f) => `### ${f.q}\n${f.a}`).join("\n\n")}

${posts.length ? `## Guías\n${posts.map((p) => `- [${p.data.title}](${site.url}/blog/${p.id}): ${p.data.description}`).join("\n")}\n\n` : ""}${nets.length ? `## Redes\n${nets.map(([, s]) => `- ${s.name}: ${s.url}${s.handle ? ` (${s.handle})` : ""}`).join("\n")}\n` : ""}`;
  return new Response(md, { headers: { "Content-Type": "text/markdown; charset=utf-8" } });
};
