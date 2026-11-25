/**
 * Genera los PNG de marca desde los SVG del manual HABITAR (public/brand/):
 *  - favicon-32.png, apple-touch-icon.png (180), icon-192.png, icon-512.png (desde el favicon y el perfil)
 *  - brand/habitar-logo.png (logo horizontal para JSON-LD)
 *  - og.png (1200x630) [PLACEHOLDER]: logo + título en Archivo, renderizado con Chromium (Playwright) para usar
 *    las fuentes reales. Reemplazar por una foto de Hernán con los planos de fondo cuando exista.
 * Uso: npm run placeholders
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pub = (p) => path.join(root, "public", p);

const fav = fs.readFileSync(pub("favicon.svg"));
const prof = fs.readFileSync(pub("brand/habitar-perfil.svg"));
await sharp(fav, { density: 300 }).resize(32, 32).png().toFile(pub("favicon-32.png"));
for (const [size, name] of [[180, "apple-touch-icon.png"], [192, "icon-192.png"], [512, "icon-512.png"]]) {
  // el perfil es un círculo: para íconos de app va sobre grafito liso (cuadrado)
  await sharp({ create: { width: size, height: size, channels: 4, background: "#161616" } })
    .composite([{ input: await sharp(prof, { density: 300 }).resize(size, size).png().toBuffer() }])
    .png()
    .toFile(pub(name));
}
await sharp(fs.readFileSync(pub("brand/habitar-horizontal.svg")), { density: 300 }).resize(954, 192).png().toFile(pub("brand/habitar-logo.png"));

// OG con Chromium (fuentes reales)
const require = createRequire(import.meta.url);
let chromium;
try {
  ({ chromium } = require("playwright"));
} catch {
  console.warn("Sin Playwright: no se regenera og.png");
  process.exit(0);
}
const font = (f) => `data:font/woff2;base64,${fs.readFileSync(path.join(root, "node_modules", f)).toString("base64")}`;
const logo = `data:image/svg+xml;base64,${fs.readFileSync(pub("brand/habitar-horizontal-inverso.svg")).toString("base64")}`;
const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:A;src:url(${font("@fontsource-variable/archivo/files/archivo-latin-wdth-normal.woff2")}) format("woff2");font-weight:100 900;font-stretch:62% 125%}
@font-face{font-family:M;src:url(${font("@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-500-normal.woff2")}) format("woff2")}
html,body{margin:0}body{width:1200px;height:630px;background:#161616;color:#F2EDE6;font-family:A;position:relative;overflow:hidden;
background-image:linear-gradient(to right,#2a2827 1px,transparent 1px),linear-gradient(to bottom,#2a2827 1px,transparent 1px);background-size:24px 24px}
.l{position:absolute;left:72px;top:64px;width:380px}
.t{position:absolute;left:72px;top:186px;width:980px;font-weight:800;font-stretch:112%;font-size:74px;line-height:1.02;letter-spacing:-.01em}
.t b{color:#F07A5E;font-weight:800}
.m{position:absolute;left:72px;bottom:54px;font-family:M;font-size:22px;letter-spacing:.14em;text-transform:uppercase;color:#B9B4AC}
.c{position:absolute;left:72px;bottom:104px;width:300px;height:12px;color:#D63A1F}
.c:before{content:"";position:absolute;left:0;right:0;top:5px;height:2px;background:currentColor}
</style></head><body><img class="l" src="${logo}"><div class="t">Tu casa en barrio cerrado, proyectada por alguien que <b>sabe construirla</b>.</div>
<div class="c"></div><div class="m">Hernán Rotela Báez · Maestro Mayor de Obras</div></body></html>`;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await page.setContent(html, { waitUntil: "load" });
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: pub("og.png") });
await browser.close();
console.log("Listo: favicon-32, apple-touch-icon, icon-192/512, brand/habitar-logo.png, og.png");
