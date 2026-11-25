import { describe, expect, test } from "vitest";
import { priceAt, quoteFor, SIZES, ETAPAS, etapasFor, inRadius, PROV_BA, PROV_CABA, OTHER_PARTIDO } from "../src/content/form-steps";

const stagesOf = (key: string) => ETAPAS.find((e) => e.key === key)!.stages;

describe("Precio (valores de control del brief)", () => {
  test.each([
    [150, 6000],
    [200, 8000],
    [250, 10000],
    [300, 11500],
  ])("completo %i m² = USD %i", (m2, usd) => expect(priceAt(m2, stagesOf("completo"))).toBe(usd));
  test("anteproyecto + ejecutivo 300 m² = USD 8.500", () => expect(priceAt(300, stagesOf("ejecutivo"))).toBe(8500));
  test("solo anteproyecto 300 m² = USD 4.250", () => expect(priceAt(300, stagesOf("ante"))).toBe(4250));
});

describe("Rangos del formulario (bordes)", () => {
  test("los 4 rangos", () => expect(SIZES.map((s) => s.value)).toEqual(["Menos de 150 m²", "150 a 200 m²", "200 a 300 m²", "Más de 300 m²"]));
  const completo = ETAPAS.find((e) => e.key === "completo")!.value;
  test("menos de 150 = hasta", () => expect(quoteFor("Menos de 150 m²", completo)).toMatchObject({ kind: "upTo", max: 6000, text: "hasta USD 6.000" }));
  test("150 a 200 = rango", () => expect(quoteFor("150 a 200 m²", completo)?.text).toBe("USD 6.000 – USD 8.000"));
  test("200 a 300 = rango con el umbral de 250", () => expect(quoteFor("200 a 300 m²", completo)?.text).toBe("USD 8.000 – USD 11.500"));
  test("más de 300 = desde", () => expect(quoteFor("Más de 300 m²", completo)).toMatchObject({ kind: "from", min: 11500, text: "desde USD 11.500" }));
  test("albañil = precio del anteproyecto", () => expect(quoteFor("Más de 300 m²", "Solo un plano para dárselo al albañil")?.text).toBe("desde USD 4.250"));
  test("sin datos = null", () => expect(quoteFor("", completo)).toBeNull());
});

describe("Radio de 150 km", () => {
  test("CABA siempre", () => expect(inRadius({ provincia: PROV_CABA })).toBe(true));
  test("Pilar sí", () => expect(inRadius({ provincia: PROV_BA, partido: "Pilar" })).toBe(true));
  test("Otro partido no", () => expect(inRadius({ provincia: PROV_BA, partido: OTHER_PARTIDO })).toBe(false));
  test("Córdoba no", () => expect(inRadius({ provincia: "Córdoba" })).toBe(false));
  test("fuera del radio: sin el servicio completo", () => expect(etapasFor({ provincia: "Córdoba" }).map((e) => e.key)).toEqual(["ante", "ejecutivo", "albanil"]));
  test("dentro del radio: las 4", () => expect(etapasFor({ provincia: PROV_CABA }).length).toBe(4));
});
