/**
 * El marco de la carátula (home). Mejora progresiva: sin JS, las barras y rieles se ven quietos y la celda
 * de la barra superior queda en ladrillo.
 *  - Una sola celda roja por pantalla: la celda "Calculá tu precio" de la barra superior se apaga
 *    (.is-quiet) mientras haya otra celda CTA de la página a la vista o la barra fija del celular esté
 *    abierta.
 *  - Barra fija del celular: aparece cuando el hero sale de pantalla, se esconde si hay otra celda CTA a la
 *    vista o el formulario está abierto (html.lf-open).
 *  - --bar-h en <html>: alto de la barra de abajo que está a la vista (rótulos en desktop, la barra del
 *    celular cuando aparece). El aviso de cookies y el video chico suben esa altura: nunca se tapan.
 *  - Reloj del riel en hora de Argentina y sección activa de la barra superior.
 * Nada depende del evento `load`.
 */
const html = document.documentElement;
const desk = matchMedia("(min-width: 1024px)");
const pageCtas = Array.from(document.querySelectorAll<HTMLElement>('[data-cta-cell="page"]'));
const frameCtas = Array.from(document.querySelectorAll<HTMLElement>('[data-cta-cell="frame"]'));
const mbar = document.querySelector<HTMLElement>("[data-mbar]");
const bbar = document.querySelector<HTMLElement>("[data-bbar]");
const hero = document.querySelector<HTMLElement>("#inicio");

const visible = new Set<Element>();
let heroOut = false;

function update() {
  const formOpen = html.classList.contains("lf-open");
  const barOn = !!mbar && !desk.matches && heroOut && visible.size === 0 && !formOpen;
  if (mbar) {
    mbar.classList.toggle("is-on", barOn);
    mbar.inert = !barOn;
  }
  frameCtas.forEach((el) => el.classList.toggle("is-quiet", visible.size > 0 || barOn));
  const h = desk.matches ? (bbar?.offsetHeight ?? 0) : barOn && mbar ? mbar.offsetHeight : 0;
  html.style.setProperty("--bar-h", `${h}px`);
}

if ("IntersectionObserver" in window) {
  // margen: lo que tapan las barras fijas (arriba ~60 px, abajo ~45 px)
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => (e.isIntersecting ? visible.add(e.target) : visible.delete(e.target)));
      update();
    },
    { rootMargin: "-64px 0px -48px 0px" },
  );
  pageCtas.forEach((el) => io.observe(el));
  if (hero) {
    new IntersectionObserver(
      ([e]) => {
        heroOut = !e.isIntersecting;
        update();
      },
      { rootMargin: "-64px 0px 0px 0px" },
    ).observe(hero);
  }
}
new MutationObserver(update).observe(html, { attributes: true, attributeFilter: ["class"] });
desk.addEventListener("change", update);
addEventListener("resize", update, { passive: true });
update();

// ---- Reloj del riel (hora de Argentina) ----
const clocks = document.querySelectorAll<HTMLTimeElement>("[data-clock]");
if (clocks.length) {
  const f = new Intl.DateTimeFormat("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "America/Argentina/Buenos_Aires" });
  const tick = () => clocks.forEach((c) => (c.textContent = f.format(new Date())));
  tick();
  setInterval(tick, 15000);
}

// ---- Sección activa en la barra superior ----
const links = Array.from(document.querySelectorAll<HTMLAnchorElement>("[data-nav-link]"));
const targets = links.map((a) => document.querySelector<HTMLElement>(a.getAttribute("href") || "")).filter(Boolean) as HTMLElement[];
if (targets.length && "IntersectionObserver" in window) {
  const spy = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        const a = links.find((l) => l.getAttribute("href") === `#${e.target.id}`);
        if (!a) return;
        if (e.isIntersecting) {
          links.forEach((l) => l.removeAttribute("aria-current"));
          a.setAttribute("aria-current", "true");
        } else if (a.hasAttribute("aria-current")) a.removeAttribute("aria-current");
      });
    },
    { rootMargin: "-45% 0px -50% 0px" },
  );
  targets.forEach((t) => spy.observe(t));
}
