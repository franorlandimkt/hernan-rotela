import { describe, expect, test } from "vitest";
import { parsePhone, toE164, countryOfCc } from "../src/content/form-steps";

describe("WhatsApp Argentina (+54): agrega el 9, saca el 0 y el 15", () => {
  test.each([
    ["11 2345-6789", "+5491123456789"],
    ["011 15 2345-6789", "+5491123456789"],
    ["9 11 2345 6789", "+5491123456789"],
    ["+54 9 11 2345 6789", "+5491123456789"],
    ["+54 11 2345 6789", "+5491123456789"],
    ["5491123456789", "+5491123456789"],
    ["541123456789", "+5491123456789"],
    ["0054 9 11 2345 6789", "+5491123456789"],
    ["221 15 456-7890", "+5492214567890"],
    ["2224 15 45-6789", "+5492224456789"],
    ["(0221) 456-7890", "+5492214567890"],
  ])("%s → %s", (raw, e164) => expect(toE164(raw, "54")).toBe(e164));
  test.each(["15 2345 6789", "2345 6789", "11 2345 678", "11 2345 67890 1"])("inválido: %s", (raw) => expect(toE164(raw, "54")).toBe(""));
});

describe("Otros países y 'Otro país'", () => {
  test("Paraguay escrito con +595 aunque el selector diga +54", () => expect(toE164("+595 981 123456", "54")).toBe("+595981123456"));
  test("Uruguay con el selector", () => expect(toE164("94 123 456", "598")).toBe("+59894123456"));
  test("Otro país: número internacional completo", () => expect(parsePhone("+44 7911 123456", "otro")).toEqual({ cc: "", num: "447911123456", ok: true }));
  test("EE.UU. sin códigos que empiezan con 0/1", () => expect(toE164("132 140 2120", "1")).toBe(""));
  test("país de Meta", () => expect([countryOfCc("54"), countryOfCc("595"), countryOfCc("otro")]).toEqual(["ar", "py", ""]));
});
