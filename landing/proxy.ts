import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

// En Next 16, "middleware" se llama "proxy": corre antes de cada request.
// Acá solo refresca la sesión; qué página exige login lo decide cada página.
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Todo menos archivos estáticos e imágenes.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
