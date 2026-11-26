/**
 * Datos estructurados JSON-LD (@graph) de la home. Todo sale de site.ts y del copy: si cambia un dato,
 * cambia acá solo.
 *  - Hernán es Maestro Mayor de Obras: nunca "arquitecto" ni "Arq.". Sin número de matrícula ni colegio.
 *  - Sin precios (no se ven en el HTML de la página: el precio sale en el formulario).
 *  - NO incluir Review ni AggregateRating hasta tener reseñas públicas verificables.
 */
import { site, socialList } from "./site";
import { faq, process, hero, stages, meta } from "../content/landing";

const u = (p = "") => `${site.url}${p}`;
const sameAs = socialList().map(([, s]) => s.url);
const base = site.base;

const areaServed = [
  {
    "@type": "GeoCircle",
    name: `Plano municipal y dirección de obra: hasta ${site.radiusKm} km de ${base.locality}`,
    geoMidpoint: { "@type": "GeoCoordinates", latitude: base.geo.lat, longitude: base.geo.lng },
    geoRadius: site.radiusKm * 1000,
  },
  { "@type": "Country", name: "Argentina" },
];

export function homeSchema({ title, description }: { title: string; description: string }) {
  const org = {
    "@type": ["ProfessionalService", "LocalBusiness"],
    "@id": u("/#org"),
    name: site.brandFull,
    alternateName: site.brand,
    url: u("/"),
    logo: { "@type": "ImageObject", url: u("/brand/habitar-logo.png"), width: 954, height: 192 },
    image: u(site.ogImage),
    description: `${site.person}, ${site.credential}. Proyecto de viviendas (anteproyecto, proyecto ejecutivo, plano municipal y tramitación) y dirección de obra en barrios cerrados del GBA. Planos a distancia para todo el país.`,
    slogan: site.tagline,
    ...(site.whatsapp ? { telephone: `+${site.whatsapp}` } : {}),
    ...(site.email ? { email: site.email } : {}),
    currenciesAccepted: "USD, ARS",
    paymentAccepted: site.payments.join(", "),
    address: { "@type": "PostalAddress", addressLocality: base.locality, addressRegion: base.region, addressCountry: base.country },
    geo: { "@type": "GeoCoordinates", latitude: base.geo.lat, longitude: base.geo.lng },
    areaServed,
    founder: { "@id": u("/#hernan") },
    ...(sameAs.length ? { sameAs } : {}),
  };

  const person = {
    "@type": "Person",
    "@id": u("/#hernan"),
    name: site.person,
    jobTitle: site.profession,
    hasCredential: { "@type": "EducationalOccupationalCredential", credentialCategory: "Título profesional matriculado", name: site.profession },
    worksFor: { "@id": u("/#org") },
    homeLocation: { "@type": "Place", name: `${base.locality}, ${base.partido}, ${base.region}` },
    knowsAbout: ["Proyecto de viviendas", "Plano municipal", "Tramitación municipal", "Dirección de obra", "Casas en barrios cerrados", "Proyecto ejecutivo", "Plano de estructura", "Instalación sanitaria", "Instalación eléctrica"],
    ...(sameAs.length ? { sameAs } : {}),
  };

  const service = {
    "@type": "Service",
    "@id": u("/#servicio"),
    name: "Proyecto de vivienda: anteproyecto, proyecto ejecutivo y plano municipal",
    serviceType: "Proyecto y plano municipal de viviendas",
    provider: { "@id": u("/#org") },
    areaServed,
    audience: { "@type": "Audience", audienceType: "Familias que van a construir su casa, sobre todo en barrios cerrados" },
    description: hero.sub,
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Etapas del proyecto",
      itemListElement: [
        ...stages.items.map((s) => ({
          "@type": "Offer",
          url: u("/#cotiza"),
          itemOffered: { "@type": "Service", name: s.title, description: `${s.text} ${s.list.join(", ")}.` },
        })),
        { "@type": "Offer", url: u("/#cotiza"), itemOffered: { "@type": "Service", name: stages.extra.title, description: stages.extra.text } },
      ],
    },
  };

  const faqPage = {
    "@type": "FAQPage",
    "@id": u("/#faq"),
    mainEntity: faq.items.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };

  const howTo = {
    "@type": "HowTo",
    "@id": u("/#proceso"),
    name: `Cómo trabaja ${site.person} el proyecto de tu casa`,
    step: process.steps.map((s, i) => ({ "@type": "HowToStep", position: i + 1, name: s.title, text: `${s.text} (${s.time})`, url: u("/#proceso") })),
  };

  const website = { "@type": "WebSite", "@id": u("/#website"), url: u("/"), name: site.brandFull, inLanguage: "es-AR", publisher: { "@id": u("/#org") } };

  const webpage = {
    "@type": "WebPage",
    "@id": u("/#webpage"),
    url: u("/"),
    name: title,
    description,
    inLanguage: "es-AR",
    isPartOf: { "@id": u("/#website") },
    about: { "@id": u("/#servicio") },
    primaryImageOfPage: { "@type": "ImageObject", url: u(site.ogImage), caption: meta.ogAlt },
  };

  return { "@context": "https://schema.org", "@graph": [org, person, service, faqPage, howTo, website, webpage] };
}
