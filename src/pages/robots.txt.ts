import type { APIRoute } from "astro";
import { site } from "../data/site";

// Permite todo, incluidos explícitamente los crawlers de buscadores e IAs. /llamada-agendada es noindex.
const bots = ["GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-User", "Claude-SearchBot", "PerplexityBot", "Perplexity-User", "Google-Extended", "Bingbot", "Applebot-Extended"];

export const GET: APIRoute = () =>
  new Response(
    ["User-agent: *", "Allow: /", "Disallow: /llamada-agendada", "", ...bots.flatMap((b) => [`User-agent: ${b}`, "Allow: /", "Disallow: /llamada-agendada", ""]), `Sitemap: ${site.url}/sitemap-index.xml`, ""].join("\n"),
    { headers: { "Content-Type": "text/plain; charset=utf-8" } },
  );
