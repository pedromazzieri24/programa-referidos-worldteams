"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RECHAZOS_REFERIDO } from "@/lib/textos";
import type { EstadoForm } from "@/lib/tipos";
import { validarLinkedin, validarPais, validarTelefono } from "@/lib/validacion";

const MAX_CV = 5 * 1024 * 1024;

function texto(formData: FormData, campo: string) {
  return String(formData.get(campo) ?? "").trim() || null;
}

// Sube el CV y llama a crear_referido(), que aplica todas las reglas en la base.
// Si la base lo rechaza, se borra el PDF: no se guarda el CV de alguien cuyo referido no prosperó.
export async function referir(_prev: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims.sub;
  if (!userId) redirect("/login");

  const busquedaId = texto(formData, "busqueda_id");
  const nombre = texto(formData, "nombre");
  const email = texto(formData, "email");
  if (!busquedaId || !nombre || !email) {
    return { ok: false, mensaje: "Please fill in the role, the candidate's name and email." };
  }
  const pais = validarPais(texto(formData, "pais"));
  const telefono = validarTelefono(texto(formData, "telefono"));
  const linkedin = validarLinkedin(texto(formData, "linkedin_url"));
  if (!pais.ok) return { ok: false, mensaje: pais.error };
  if (!telefono.ok) return { ok: false, mensaje: telefono.error };
  if (!linkedin.ok) return { ok: false, mensaje: linkedin.error };

  const cv = formData.get("cv");
  if (!(cv instanceof File) || cv.size === 0) return { ok: false, mensaje: "Please attach the CV as a PDF." };
  if (cv.size > MAX_CV) return { ok: false, mensaje: "The CV can't be larger than 5 MB." };
  // Se mira el contenido, no solo la extensión: un PDF siempre empieza con "%PDF".
  const cabecera = new TextDecoder().decode(await cv.slice(0, 4).arrayBuffer());
  if (cabecera !== "%PDF") return { ok: false, mensaje: "The CV must be a PDF file." };

  // La carpeta es el id del usuario: la policy del bucket solo le deja escribir ahí.
  const path = `${userId}/${crypto.randomUUID()}.pdf`;
  const subida = await supabase.storage.from("cvs").upload(path, cv, { contentType: "application/pdf" });
  if (subida.error) {
    console.error("Subida de CV:", subida.error.message);
    return { ok: false, mensaje: "We couldn't upload the CV. Please try again." };
  }

  const { data, error } = await supabase.rpc("crear_referido", {
    p_busqueda_id: busquedaId,
    p_nombre: nombre,
    p_email: email,
    p_linkedin_url: linkedin.valor,
    p_telefono: telefono.valor,
    p_pais: pais.valor,
    p_cv_path: path,
  });

  const resultado = data as { ok: boolean; motivo?: string } | null;
  if (error || !resultado?.ok) {
    await supabase.storage.from("cvs").remove([path]);
    if (error) console.error("crear_referido:", error.message);
    const mensaje = (resultado?.motivo && RECHAZOS_REFERIDO[resultado.motivo]) || "We couldn't save the referral. Please try again.";
    return { ok: false, mensaje };
  }

  revalidatePath("/my-referrals");
  return { ok: true, mensaje: `Done! We emailed ${nombre} so they can confirm they want to take part.` };
}
