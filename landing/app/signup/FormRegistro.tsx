"use client";

import Link from "next/link";
import { useActionState } from "react";
import { CampoLinkedin } from "../components/CampoLinkedin";
import { Mensaje } from "../components/Mensaje";
import { PaisTelefono } from "../components/PaisTelefono";
import { useCuentaRegresiva } from "../components/useCuentaRegresiva";
import { registrarse } from "../acciones-auth";

export function FormRegistro() {
  const [estado, accion, enviando] = useActionState(registrarse, null);
  const restante = useCuentaRegresiva(estado);

  if (estado?.ok) {
    return (
      <div className="mt-8 rounded-2xl bg-wt-crema p-6">
        <p className="font-display text-lg font-semibold">Check your inbox</p>
        <p className="mt-1 text-sm text-zinc-700">{estado.mensaje}</p>
        <p className="mt-3 text-xs text-zinc-500">
          Didn&apos;t get it? Check your spam folder, or{" "}
          {restante > 0 ? (
            <>request a new one from Log in in {restante}s.</>
          ) : (
            <Link href="/login" className="font-medium text-wt-teal hover:underline">request a new one from Log in</Link>
          )}
        </p>
      </div>
    );
  }

  return (
    <form action={accion} className="mt-8 space-y-5">
      <div>
        <label htmlFor="nombre" className="etiqueta">Full name</label>
        <input id="nombre" name="nombre" required className="campo" autoComplete="name" />
      </div>
      <div>
        <label htmlFor="email" className="etiqueta">Email</label>
        <input id="email" name="email" type="email" required className="campo" autoComplete="email" />
        <p className="mt-1 text-xs text-zinc-500">
          If you work at WorldTeams or with a client through WorldTeams, use your corporate email: that&apos;s how we
          recognize you for the higher reward.
        </p>
      </div>
      <fieldset>
        <legend className="etiqueta">What&apos;s your relationship with WorldTeams?</legend>
        <div className="mt-2 space-y-2 text-sm">
          {[
            ["interno", "I'm on the WorldTeams team"],
            ["colocado", "I work with a client through WorldTeams"],
            ["externo", "None"],
          ].map(([valor, texto]) => (
            <label key={valor} className="flex items-center gap-2">
              <input type="radio" name="tipo_declarado" value={valor} required defaultChecked={valor === "externo"} className="accent-wt-verde" />
              {texto}
            </label>
          ))}
        </div>
      </fieldset>
      <PaisTelefono />
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="area" className="etiqueta">Field</label>
          <input id="area" name="area" className="campo" placeholder="e.g. Architecture, MEP" />
        </div>
        <CampoLinkedin />
      </div>
      <Mensaje estado={estado} />
      <button type="submit" className="boton w-full" disabled={enviando || restante > 0}>
        {enviando ? "Sending..." : restante > 0 ? `You can request a new link in ${restante}s` : "Email me the link"}
      </button>
    </form>
  );
}
