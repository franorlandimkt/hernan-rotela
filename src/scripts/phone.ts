/**
 * WhatsApp del formulario: lee, valida y da formato al número en el navegador.
 *  - Primero form-steps.ts → parsePhone (la MISMA lectura que usan las funciones): saca el código de país que
 *    venga escrito (+54, 54, 0054…) y, en Argentina, deja 9 + área + número (agrega el 9 si falta y saca el
 *    0 y el 15).
 *  - Después libphonenumber-js (metadata "mobile") confirma que el número existe para ese país. Se baja aparte,
 *    al abrir el formulario (loadPhoneLib); si no carga, queda solo la validación de parsePhone.
 *  - Lo que se manda no cambia: pais_codigo + whatsapp_num (número nacional) → el servidor arma el E.164
 *    (+5491123456789).
 */
import { parsePhone, E164_RE } from "../content/form-steps";

type Lib = typeof import("libphonenumber-js/mobile");
let lib: Lib | null = null;
let loading: Promise<Lib | null> | null = null;

/** Baja libphonenumber-js una sola vez (si falla, se puede volver a intentar). */
export function loadPhoneLib(): Promise<Lib | null> {
  loading ??= import("libphonenumber-js/mobile")
    .then((m) => (lib = m))
    .catch(() => {
      loading = null;
      return null;
    });
  return loading;
}

export interface PhoneRead {
  /** Código de país ("54", "595"…); "" si es de un país fuera de la lista ("Otro país"). */
  cc: string;
  /** Número sin el código de país (con "Otro país": el número internacional completo, sin "+"). */
  num: string;
  /** Largo correcto para ese país (parsePhone). */
  lengthOk: boolean;
  /** Largo correcto y, si libphonenumber cargó, un número que existe. */
  ok: boolean;
  /** Cómo se ve en el campo: "9 11 2345-6789"; con "Otro país", "+44 7911 123456". */
  field: string;
  /** Cómo se ve en la confirmación: "+54 9 11 2345-6789". */
  display: string;
}

const digits = (s: string) => s.replace(/\D/g, "");

/** Lee el WhatsApp como venga (tecleado, pegado o del autocompletado) con el código del selector. */
export function readPhone(raw: string, selectedCc: string): PhoneRead {
  const p = parsePhone(raw, selectedCc);
  const e164 = `+${p.cc}${p.num}`;
  // E164_RE: lo mismo que exige el servidor (si no, el envío se rechazaría y el lead se perdería)
  const lengthOk = p.ok && E164_RE.test(e164);
  const out: PhoneRead = { cc: p.cc, num: p.num, lengthOk, ok: lengthOk, field: p.cc ? p.num : `+${p.num}`, display: e164 };
  if (!lib || !p.num) return out;
  const pn = lib.parsePhoneNumberFromString(e164);
  out.ok = lengthOk && !!pn?.isValid();
  if (!pn || !out.ok) return out;
  // Se manda el número como lo deja libphonenumber, siempre que el servidor lo lea igual; si no, el de parsePhone.
  const nn = String(pn.nationalNumber);
  if (p.cc && String(pn.countryCallingCode) === p.cc) {
    const again = parsePhone(nn, p.cc);
    if (again.ok && again.num === nn) out.num = nn;
  }
  const intl = pn.formatInternational();
  // En el campo: el formato internacional sin el código del selector (así se vuelve a leer igual)
  out.field = p.cc ? intl.replace(/^\+\d+\s*/, "") : intl;
  out.display = intl;
  return out;
}

/**
 * Máscara mientras escribe ("11 2345-6789" con +54). Con "+" adelante, formato internacional.
 * Devuelve null si no hay nada que formatear (sin libphonenumber o si cambiaría los dígitos).
 */
export function maskPhone(raw: string, region: string): string | null {
  if (!lib || !digits(raw)) return null;
  const s = raw.trim();
  const intl = s.startsWith("+") || s.startsWith("00");
  if (!intl && !region) return null;
  const typed = s.startsWith("00") ? `+${digits(s).slice(2)}` : intl ? `+${digits(s)}` : digits(s);
  const out = intl ? new lib.AsYouType().input(typed) : new lib.AsYouType(region as Parameters<Lib["getCountryCallingCode"]>[0]).input(typed);
  return digits(out) === digits(typed) ? out : null;
}
