"use client";

import { useEffect, useState } from "react";
import { AVISO_INGRESO } from "@/lib/textos";

// Aviso al llegar desde el magic link (?welcome=1). Que se abra en una pestaña nueva lo decide el cliente
// de correo, no la landing. Saca el parámetro de la URL para que no vuelva a aparecer al recargar.
export function AvisoIngreso() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.delete("welcome");
    history.replaceState(null, "", url);
  }, []);

  if (!visible) return null;
  return (
    <div role="status" className="mb-6 flex items-start justify-between gap-4 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
      <p>{AVISO_INGRESO}</p>
      <button type="button" onClick={() => setVisible(false)} aria-label="Close" className="font-bold leading-none">
        ×
      </button>
    </div>
  );
}
