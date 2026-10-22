"use client";

import { useState } from "react";
import { PAISES, buscarPais } from "@/lib/paises";

// País + teléfono: al elegir el país, el prefijo del teléfono se completa solo.
// Envía `pais` (código) y `telefono` (prefijo + número, formato internacional) en un input oculto.
export function PaisTelefono({ etiquetaTelefono = "Phone (optional)" }: { etiquetaTelefono?: string }) {
  const [pais, setPais] = useState("");
  const [numero, setNumero] = useState("");
  const prefijo = buscarPais(pais)?.prefijo ?? "+";
  const otro = pais === "OTHER" || pais === "";
  // Con "Other" (o sin país) se escribe el número completo con su +código.
  const telefono = otro ? numero : numero.trim() ? `${prefijo}${numero}` : "";

  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <div>
        <label htmlFor="pais" className="etiqueta">Country</label>
        <select id="pais" name="pais" className="campo" value={pais} onChange={(e) => setPais(e.target.value)}>
          <option value="">Choose a country</option>
          {PAISES.map((p) => (
            <option key={p.codigo} value={p.codigo}>
              {p.bandera} {p.nombre}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="telefono_numero" className="etiqueta">{etiquetaTelefono}</label>
        <div className="mt-1 flex rounded-md shadow-sm">
          {!otro && (
            <span className="inline-flex items-center rounded-l-md border border-r-0 border-zinc-300 bg-wt-crema px-3 font-display text-sm text-zinc-700">
              {prefijo}
            </span>
          )}
          <input
            id="telefono_numero"
            inputMode="tel"
            autoComplete="tel-national"
            value={numero}
            onChange={(e) => setNumero(e.target.value)}
            placeholder={otro ? "+1 555 123 4567" : "351 555 0001"}
            pattern={otro ? "\\+?[0-9 ()\\-]{8,20}" : "[0-9 ()\\-]{6,18}"}
            title="Digits only (spaces and dashes are fine)."
            className={`block w-full border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-wt-teal focus:ring-2 focus:ring-wt-lima focus:outline-none ${otro ? "rounded-md" : "rounded-r-md"}`}
          />
        </div>
        <input type="hidden" name="telefono" value={telefono} />
      </div>
    </div>
  );
}
