/**
 * Fotos y renders de src/assets/img/: se detectan por NOMBRE DE ARCHIVO, así subir una foto no requiere tocar
 * código ni copy. Nombres: src/assets/img/LEEME.md.
 *  - hasImg("hernan")          → true si existe src/assets/img/hernan.(jpg|jpeg|png|webp)
 *  - imgSeries("proyecto-escobar") → ["proyecto-escobar-1", "proyecto-escobar-2", …] en orden numérico
 * Solo material propio de Hernán (renders, planos y obras donde él es el profesional).
 */
const files = import.meta.glob("/src/assets/img/*.{jpg,jpeg,png,webp}");
const names = Object.keys(files).map((k) => k.split("/").pop()!.replace(/\.\w+$/, ""));

export const hasImg = (name: string) => !!name && names.includes(name);

export const imgSeries = (prefix: string) =>
  names
    .filter((n) => new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}-\\d+$`).test(n))
    .sort((a, b) => Number(a.split("-").pop()) - Number(b.split("-").pop()));

/** Solo en `npm run dev`: se marcan los lugares donde falta una foto, con el nombre de archivo a subir. */
export const DEV = import.meta.env.DEV;
