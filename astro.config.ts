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
      // Los artículos publicados del blog entran (los borradores, draft: true, no se generan). El índice /blog
      // queda afuera mientras no haya ninguno publicado (es noindex): al publicar el primero, sacá "/blog" de acá.
      filter: (page) => !["/llamada-agendada"].some((p) => page.includes(p)) && !page.replace(/\/$/, "").endsWith("/blog"),
    }),
  ],
  image: { responsiveStyles: false },
});
