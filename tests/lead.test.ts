import { describe, expect, test } from "vitest";
import { cleanAnswers, nextStep, EXIT, qualifies, isHot, validAnswers, totalSteps, originOf, exitReason, leadType, type FlowAnswers } from "../src/scripts/lead";
import { TIPOS, TERRENOS, PROV_BA, PROV_CABA, OTHER_PARTIDO, ETAPAS } from "../src/content/form-steps";

const etapa = (k: string) => ETAPAS.find((e) => e.key === k)!.value;
const base: FlowAnswers = { tipo: TIPOS.barrio.value, terreno: TERRENOS.si.value, provincia: PROV_BA, partido: "Pilar", direccion: "Solo el proyecto", m2: "200 a 300 m²", etapas: etapa("completo"), cuando: "En 1 a 3 meses", decide: "Con mi pareja" };

describe("Ramas", () => {
  test("regularización → descarte", () => {
    const a = { tipo: TIPOS.regularizacion.value };
    expect(nextStep("tipo", a)).toBe(EXIT);
    expect(exitReason("tipo", a)).toBe("regularizacion");
  });
  test("Buenos Aires → partido → dirección (dentro del radio)", () => {
    expect(nextStep("provincia", { provincia: PROV_BA })).toBe("partido");
    expect(nextStep("partido", { provincia: PROV_BA, partido: "Pilar" })).toBe("direccion");
    expect(nextStep("partido", { provincia: PROV_BA, partido: OTHER_PARTIDO })).toBe("m2");
  });
  test("CABA → dirección; Córdoba → m²", () => {
    expect(nextStep("provincia", { provincia: PROV_CABA })).toBe("direccion");
    expect(nextStep("provincia", { provincia: "Córdoba" })).toBe("m2");
  });
  test("pasos: GBA dentro del radio 9 preguntas + datos; Córdoba 7 + datos", () => {
    expect(totalSteps(base)).toBe(10);
    expect(totalSteps({ provincia: "Córdoba" })).toBe(8);
  });
});

describe("Lead / LeadCaliente / Sin terreno", () => {
  test("con lote = Lead y caliente", () => {
    expect(qualifies(base)).toBe(true);
    expect(isHot(base)).toBe(true);
    expect(leadType(base)).toBe("Con lote");
  });
  test("comprando = Lead", () => expect(qualifies({ ...base, terreno: TERRENOS.comprando.value })).toBe(true));
  test("sin lote = válido pero no Lead", () => {
    const a = { ...base, terreno: TERRENOS.no.value };
    expect(validAnswers(a)).toBe(true);
    expect(qualifies(a)).toBe(false);
    expect(leadType(a)).toBe("Sin terreno");
  });
  test("plano para el albañil = Lead pero no caliente", () => {
    const a = { ...base, etapas: etapa("albanil") };
    expect(qualifies(a)).toBe(true);
    expect(isHot(a)).toBe(false);
  });
  test("multifamiliar = caliente", () => expect(isHot({ ...base, tipo: TIPOS.multi.value })).toBe(true));
  test("completo fuera del radio (página vieja) = se guarda igual", () => expect(validAnswers({ ...base, provincia: "Córdoba", partido: undefined, direccion: undefined })).toBe(true));
  test("cleanAnswers saca el partido fuera de Buenos Aires y la dirección fuera del radio", () =>
    expect(cleanAnswers({ ...base, provincia: "Córdoba", cuando: "otra cosa" })).toMatchObject({ partido: "", direccion: "", cuando: "" }));
  test("sin partido en Buenos Aires = inválido", () => expect(validAnswers({ ...base, partido: "" })).toBe(false));
  test("fuera del radio con ejecutivo = válido", () => expect(validAnswers({ ...base, provincia: "Córdoba", partido: undefined, direccion: undefined, etapas: etapa("ejecutivo") })).toBe(true));
  test("regularización nunca es válida", () => expect(validAnswers({ ...base, tipo: TIPOS.regularizacion.value })).toBe(false));
  test("cuándo y quién decide pueden faltar", () => expect(validAnswers({ ...base, cuando: undefined, decide: undefined })).toBe(true));
});

describe("Origen", () => {
  test("pauta", () => expect(originOf({ utm_medium: "paid", utm_source: "facebook" })).toBe("Pauta Meta"));
  test("bio TikTok separada de la pauta", () => expect(originOf({ utm_medium: "bio", utm_source: "tiktok" })).toBe("Bio TikTok"));
  test("bio Instagram", () => expect(originOf({ utm_medium: "bio", utm_source: "instagram" })).toBe("Bio Instagram"));
  test("solo IDs de anuncio = pauta", () => expect(originOf({ ad_id: "123" })).toBe("Pauta Meta"));
  test("nada = orgánico", () => expect(originOf({ referrer: "https://www.google.com/" })).toBe("Orgánico / directo"));
});
