"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { EstadoForm } from "@/lib/tipos";
import { validarLinkedin, validarPais, validarTelefono } from "@/lib/validacion";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TIPOS = ["interno", "colocado", "externo"];

function texto(formData: FormData, campo: string) {
  return String(formData.get(campo) ?? "").trim();
}

// El magic link vuelve a /auth/confirm de este mismo sitio (local o Vercel).
async function urlDeRetorno(siguiente: string) {
  const origin = (await headers()).get("origin");
  return `${origin}/auth/confirm?next=${encodeURIComponent(siguiente)}`;
}

const ESPERA_ENTRE_LINKS = 60;

// Supabase tiene dos límites distintos y los separa por código:
// - over_request_rate_limit: un link por mail cada 60 s ("...after 42 seconds") → cuenta regresiva.
// - over_email_send_rate_limit: tope de mails por hora de TODO el proyecto (se configura en Authentication → Rate Limits).
function errorDeEnvio(error: { code?: string; message: string }): EstadoForm {
  console.error("signInWithOtp:", error.code ?? "sin código", "-", error.message);
  if (error.code === "over_email_send_rate_limit") {
    return { ok: false, mensaje: "We've sent too many emails in the last hour. Please try again later." };
  }
  if (error.code === "over_request_rate_limit" || /security purposes|after \d+ seconds/i.test(error.message)) {
    const segundos = Number(error.message.match(/(\d+)\s*seconds?/)?.[1] ?? ESPERA_ENTRE_LINKS);
    return { ok: false, mensaje: "You just requested a link. Please wait before asking for another one.", esperar: segundos };
  }
  // Sin SMTP propio, Supabase solo manda mails a los miembros del equipo del proyecto.
  if (error.code === "email_address_not_authorized") {
    return { ok: false, mensaje: "We can't send emails to that address yet. Please try again later." };
  }
  if (error.code === "otp_disabled" || /signups not allowed|user not found/i.test(error.message)) {
    return { ok: false, mensaje: "We couldn't find an account with that email. Sign up first." };
  }
  return { ok: false, mensaje: "We couldn't send you the link. Please try again in a moment." };
}

function linkEnviado(email: string): EstadoForm {
  return {
    ok: true,
    mensaje: `We sent a link to ${email}. Open it in this same browser. If you request another one, only the most recent email will work.`,
    esperar: ESPERA_ENTRE_LINKS,
  };
}

// Registro: manda el magic link con los datos del perfil. El referente se crea en la base cuando confirma el mail
// (trigger handle_new_user), y ahí se define el tipo según el dominio: lo que declara acá no alcanza para cobrar más.
export async function registrarse(_prev: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const email = texto(formData, "email").toLowerCase();
  const nombre = texto(formData, "nombre");
  const tipo = texto(formData, "tipo_declarado");

  if (!nombre) return { ok: false, mensaje: "Please tell us your name." };
  if (!EMAIL_RE.test(email)) return { ok: false, mensaje: "That email doesn't look right." };
  if (!TIPOS.includes(tipo)) return { ok: false, mensaje: "Choose your relationship with WorldTeams." };
  const pais = validarPais(texto(formData, "pais"));
  const telefono = validarTelefono(texto(formData, "telefono"));
  const linkedin = validarLinkedin(texto(formData, "linkedin_url"));
  for (const r of [pais, telefono, linkedin]) if (!r.ok) return { ok: false, mensaje: r.error };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: await urlDeRetorno("/refer"),
      data: {
        nombre,
        tipo_declarado: tipo,
        pais: pais.ok ? pais.valor : null,
        area: texto(formData, "area"),
        telefono: telefono.ok ? telefono.valor : null,
        linkedin_url: linkedin.ok ? linkedin.valor : null,
      },
    },
  });

  if (error) return errorDeEnvio(error);
  return linkEnviado(email);
}

// Ingreso: solo para cuentas que ya existen (no crea usuarios).
export async function ingresar(_prev: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const email = texto(formData, "email").toLowerCase();
  if (!EMAIL_RE.test(email)) return { ok: false, mensaje: "That email doesn't look right." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false, emailRedirectTo: await urlDeRetorno("/my-referrals") },
  });

  if (error) return errorDeEnvio(error);
  return linkEnviado(email);
}

export async function salir() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
