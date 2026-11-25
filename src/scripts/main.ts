/**
 * Script global (mejora progresiva, sin librerías):
 *  - Animaciones de entrada con IntersectionObserver (.reveal, .reveal-cota)
 *  - Contadores: el valor final YA está en el HTML; esto solo anima si el JS corre.
 *  - Atribución al entrar (UTMs, IDs de anuncio, fbclid, URL de entrada y referrer) y consentimiento.
 */
import { captureAttribution, applyConsent, isTestMode } from "./tracking";

captureAttribution();
applyConsent();
isTestMode(); // ?modo=prueba queda guardado para toda la pestaña

const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const nf = new Intl.NumberFormat("es-AR");

function animateCount(el: HTMLElement) {
  const end = Number(el.dataset.count);
  const suffix = el.dataset.suffix ?? "";
  const prefix = el.dataset.prefix ?? "";
  if (!end || reduce) return;
  const dur = 1200;
  const t0 = performance.now();
  const step = (t: number) => {
    const p = Math.min(1, (t - t0) / dur);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = prefix + nf.format(Math.max(1, Math.round(end * eased))) + suffix;
    if (p < 1) requestAnimationFrame(step);
    else el.textContent = prefix + nf.format(end) + suffix; // siempre termina en el valor real
  };
  requestAnimationFrame(step);
}

const targets = document.querySelectorAll<HTMLElement>(".reveal, .reveal-cota, [data-count]");
if ("IntersectionObserver" in window) {
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        const el = e.target as HTMLElement;
        el.classList.add("is-in");
        if (el.dataset.count) animateCount(el);
        io.unobserve(el);
      });
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
  );
  targets.forEach((t) => io.observe(t));
} else {
  targets.forEach((t) => t.classList.add("is-in"));
}

// Señal para el failsafe del <head>: si este script no corre, se quita la clase .js y todo queda visible.
(window as unknown as { __hrReady: boolean }).__hrReady = true;
