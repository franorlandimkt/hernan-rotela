import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

/**
 * Blog (GEO/AEO). Cada artículo es un .md en src/content/blog/.
 * draft: true (por defecto) → NO se publica: solo se ve con `npm run dev`. Fuera del sitemap y de llms.txt.
 */
const blog = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/blog" }),
  schema: z.object({
    title: z.string().max(70),
    description: z.string().max(160),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    draft: z.boolean().default(true),
    keywords: z.array(z.string()).default([]),
  }),
});

export const collections = { blog };
