import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import { site } from "./src/data/site";

// El dominio se define en src/data/site.ts (site.url). Todo lo demás sale de ahí.
export default defineConfig({
  site: site.url,
  trailingSlash: "never",
  build: { format: "file", inlineStylesheets: "auto" },
  compressHTML: true,
  integrations: [
    sitemap({
      // /llamada-agendada es la página de después de agendar (noindex): fuera del sitemap.
      // El blog entra (los borradores, draft: true, no se publican: ver src/pages/blog/[...slug].astro).
      filter: (page) => !["/llamada-agendada"].some((p) => page.includes(p)),
    }),
  ],
  image: { responsiveStyles: false },
});
