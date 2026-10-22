"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { enviarSinVaciar } from "../components/enviarSinVaciar";
import { Mensaje } from "../components/Mensaje";
import { useCuentaRegresiva } from "../components/useCuentaRegresiva";
import { registrarse } from "../acciones-auth";

// Registro corto (22/10): nombre, mail y relación. País y datos de pago se piden al cobrar, para que registrarse
// no frene a referir. El tipo que se declara acá no alcanza para cobrar más: lo define el dominio del mail.
const RELACIONES = [
  { valor: "interno", titulo: "I'm on the WorldTeams team", ayuda: "Use your corporate email" },
  { valor: "colocado", titulo: "I work with a client through WorldTeams", ayuda: "Placed by WorldTeams" },
  { valor: "externo", titulo: "None of these", ayuda: "Anyone can refer" },
];

export function FormRegistro() {
  const [estado, accion, enviando] = useActionState(registrarse, null);
  const restante = useCuentaRegresiva(estado);
  const [relacion, setRelacion] = useState("externo");

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
    <form onSubmit={enviarSinVaciar(accion)} className="mt-8 space-y-5">
      <div>
        <label htmlFor="nombre" className="etiqueta">Full name</label>
        <input id="nombre" name="nombre" required className="campo" autoComplete="name" />
      </div>
      <div>
        <label htmlFor="email" className="etiqueta">Email</label>
        <input id="email" name="email" type="email" required className="campo" autoComplete="email" />
      </div>
      <fieldset>
        <legend className="etiqueta">What&apos;s your relationship with WorldTeams?</legend>
        {/* Radios nativos escondidos dentro de tarjetas: el teclado (Tab y flechas) y el envío funcionan como siempre. */}
        <div className="mt-2 space-y-2.5">
          {RELACIONES.map((r) => (
            <label
              key={r.valor}
              className="group flex cursor-pointer items-center gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3 transition hover:border-zinc-300 has-checked:border-wt-verde has-checked:bg-wt-lima/25 has-checked:shadow-sm has-focus-visible:ring-2 has-focus-visible:ring-wt-lima"
            >
              <input
                type="radio"
                name="tipo_declarado"
                value={r.valor}
                required
                checked={relacion === r.valor}
                onChange={() => setRelacion(r.valor)}
                className="sr-only"
              />
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full border-2 border-zinc-300 text-[10px] font-bold text-transparent transition group-has-checked:border-wt-verde group-has-checked:bg-wt-verde group-has-checked:text-wt-lima">
                ✓
              </span>
              <span className="flex flex-col">
                <span className="font-display text-sm font-semibold">{r.titulo}</span>
                <span className="text-xs text-zinc-500">{r.ayuda}</span>
              </span>
            </label>
          ))}
        </div>
        {relacion !== "externo" && (
          <p className="mt-3 rounded-lg bg-wt-crema px-3 py-2 text-xs text-zinc-700">
            Make sure you used your corporate email above: that&apos;s how we recognize you for the higher reward.
          </p>
        )}
      </fieldset>
      <Mensaje estado={estado} />
      <button type="submit" className="boton w-full" disabled={enviando || restante > 0}>
        {enviando ? "Sending..." : restante > 0 ? `You can request a new link in ${restante}s` : "Email me the link"}
      </button>
    </form>
  );
}
