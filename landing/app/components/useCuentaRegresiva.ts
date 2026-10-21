"use client";

import { useEffect, useState } from "react";
import type { EstadoForm } from "@/lib/tipos";

// Segundos que faltan para poder pedir otro magic link. Arranca cada vez que la Server Action devuelve `esperar`.
export function useCuentaRegresiva(estado: EstadoForm) {
  const [restante, setRestante] = useState(0);

  useEffect(() => {
    if (!estado?.esperar) return;
    const fin = Date.now() + estado.esperar * 1000;
    const tick = () => setRestante(Math.max(0, Math.ceil((fin - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [estado]);

  return restante;
}
