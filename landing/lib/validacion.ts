import { buscarPais } from "./paises";

// Validaciones compartidas: el navegador las usa para avisar al instante y el servidor las repite,
// porque lo que llega del navegador nunca se da por bueno.

type Resultado = { ok: true; valor: string | null } | { ok: false; error: string };

// Opcional. Acepta "linkedin.com/in/x", con o sin https/www/subdominio de país, y lo guarda con un formato único.
export const PATRON_LINKEDIN = "^(https?://)?([a-zA-Z]{2,3}\\.)?(www\\.)?linkedin\\.com/in/[A-Za-z0-9_%\\-]+/?(\\?.*)?$";

export function validarLinkedin(entrada: string | null): Resultado {
  const v = (entrada ?? "").trim();
  if (!v) return { ok: true, valor: null };
  if (!new RegExp(PATRON_LINKEDIN, "i").test(v)) {
    return { ok: false, error: "LinkedIn must be a profile link, like linkedin.com/in/your-name." };
  }
  const slug = v.match(/linkedin\.com\/in\/([^/?#]+)/i)![1];
  return { ok: true, valor: `https://www.linkedin.com/in/${slug}` };
}

// Opcional. Llega ya con el prefijo del país (+54...). Se guarda en formato internacional: + y solo dígitos.
export function validarTelefono(entrada: string | null): Resultado {
  const v = (entrada ?? "").replace(/[\s\-().]/g, "");
  if (!v || /^\+\d{0,4}$/.test(v)) return { ok: true, valor: null }; // solo el prefijo = no lo cargó
  if (!/^\+[1-9]\d{7,14}$/.test(v)) {
    return { ok: false, error: "That phone number doesn't look right. Check the number and the country code." };
  }
  return { ok: true, valor: v };
}

// Opcional. Solo códigos de la lista.
export function validarPais(entrada: string | null): Resultado {
  const v = (entrada ?? "").trim();
  if (!v) return { ok: true, valor: null };
  if (!buscarPais(v)) return { ok: false, error: "Choose a country from the list." };
  return { ok: true, valor: v };
}
