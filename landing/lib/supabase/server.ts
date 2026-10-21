import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseEnv } from "./env";

// Cliente para Server Components, Server Actions y Route Handlers.
// Lee la sesión del usuario desde las cookies: con ella, auth.uid() en la base es el usuario logueado.
// Se crea uno nuevo por request (no se reutiliza entre usuarios).
export async function createClient() {
  const { url, key } = supabaseEnv();
  const cookieStore = await cookies();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Un Server Component no puede escribir cookies. No pasa nada: proxy.ts ya refresca la sesión en cada request.
        }
      },
    },
  });
}

// Id del usuario logueado, o null. getClaims() valida el token (no confía a ciegas en la cookie).
export async function getUserId() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return data?.claims.sub ?? null;
}
