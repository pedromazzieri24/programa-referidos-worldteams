import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Adonde llega el magic link. Convierte el código del mail en una sesión (cookies) y redirige.
// Acepta los dos formatos de Supabase: `code` (el link por defecto, que exige abrirlo en el mismo navegador)
// y `token_hash` (si se personaliza la plantilla del mail; funciona en cualquier navegador).
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  // Solo rutas internas: evita que un link armado mande al usuario a otro sitio.
  const nextParam = searchParams.get("next") ?? "/my-referrals";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/my-referrals";

  const supabase = await createClient();
  let ok = false;

  if (code) {
    ok = !(await supabase.auth.exchangeCodeForSession(code)).error;
  } else if (tokenHash && type) {
    ok = !(await supabase.auth.verifyOtp({ type, token_hash: tokenHash })).error;
  }

  return NextResponse.redirect(new URL(ok ? next : "/login?error=link", origin));
}
