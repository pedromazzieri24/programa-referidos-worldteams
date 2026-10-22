"use server";

import { createClient } from "@/lib/supabase/server";
import { RESPUESTAS_CONSENTIMIENTO } from "@/lib/textos";
import type { EstadoForm } from "@/lib/tipos";

// El candidato no tiene cuenta: el token del link es lo que lo identifica. Las funciones de la base validan el token.
export async function responder(_prev: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const token = String(formData.get("token") ?? "");
  const funcion = formData.get("respuesta") === "si" ? "confirmar_consentimiento" : "rechazar_consentimiento";

  const supabase = await createClient();
  const { data, error } = await supabase.rpc(funcion, { p_token: token });
  if (error) {
    console.error(`${funcion}:`, error.message);
    return { ok: false, mensaje: "We couldn't save your answer. Please try again." };
  }
  const { ok, codigo } = data as { ok: boolean; codigo: string };
  return { ok, mensaje: RESPUESTAS_CONSENTIMIENTO[codigo] ?? RESPUESTAS_CONSENTIMIENTO.invalid };
}
