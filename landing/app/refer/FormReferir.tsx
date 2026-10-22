"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef } from "react";
import { CampoLinkedin } from "../components/CampoLinkedin";
import { enviarSinVaciar } from "../components/enviarSinVaciar";
import { Mensaje } from "../components/Mensaje";
import { PaisTelefono } from "../components/PaisTelefono";
import { referir } from "./acciones";

type Opcion = { id: string; texto: string };

export function FormReferir({ busquedas, preseleccion }: { busquedas: Opcion[]; preseleccion: string }) {
  const [estado, accion, enviando] = useActionState(referir, null);
  const form = useRef<HTMLFormElement>(null);

  // Si salió bien, se vacía el formulario para poder referir a otra persona.
  useEffect(() => {
    if (estado?.ok) form.current?.reset();
  }, [estado]);

  return (
    <form ref={form} onSubmit={enviarSinVaciar(accion)} className="mt-8 space-y-5" key={estado?.ok ? estado.mensaje : "form"}>
      <div>
        <label htmlFor="busqueda_id" className="etiqueta">Role</label>
        <select id="busqueda_id" name="busqueda_id" required className="campo" defaultValue={preseleccion}>
          <option value="" disabled>Choose an open role</option>
          {busquedas.map((b) => (
            <option key={b.id} value={b.id}>{b.texto}</option>
          ))}
        </select>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="nombre" className="etiqueta">Full name</label>
          <input id="nombre" name="nombre" required className="campo" />
        </div>
        <div>
          <label htmlFor="email" className="etiqueta">Email</label>
          <input id="email" name="email" type="email" required className="campo" />
        </div>
      </div>
      <CampoLinkedin />
      <PaisTelefono />
      <div>
        <label htmlFor="cv" className="etiqueta">CV (PDF, up to 5 MB)</label>
        <input id="cv" name="cv" type="file" accept="application/pdf" required
          className="mt-1 block w-full text-sm file:mr-3 file:rounded-full file:border-0 file:bg-wt-crema file:px-4 file:py-2 file:font-display file:text-sm file:text-wt-negro" />
      </div>
      <Mensaje estado={estado} />
      {estado?.ok && (
        <p className="text-sm">
          <Link href="/my-referrals" className="font-medium text-wt-teal hover:underline">Track it in My referrals →</Link>
        </p>
      )}
      <button type="submit" className="boton w-full" disabled={enviando}>
        {enviando ? "Sending..." : "Refer"}
      </button>
    </form>
  );
}
