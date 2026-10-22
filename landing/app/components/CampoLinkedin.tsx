"use client";

import { validarLinkedin } from "@/lib/validacion";

// Avisa en el momento si lo escrito no es un perfil de LinkedIn (el servidor lo vuelve a validar al enviar).
export function CampoLinkedin({ etiqueta = "LinkedIn (optional)" }: { etiqueta?: string }) {
  return (
    <div>
      <label htmlFor="linkedin_url" className="etiqueta">{etiqueta}</label>
      <input
        id="linkedin_url"
        name="linkedin_url"
        className="campo"
        placeholder="linkedin.com/in/..."
        onChange={(e) => {
          const r = validarLinkedin(e.target.value);
          e.target.setCustomValidity(r.ok ? "" : r.error);
        }}
      />
    </div>
  );
}
