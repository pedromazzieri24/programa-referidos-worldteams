"use client";

import { useActionState } from "react";
import { Mensaje } from "../components/Mensaje";
import { useCuentaRegresiva } from "../components/useCuentaRegresiva";
import { ingresar } from "../acciones-auth";

export function FormLogin() {
  const [estado, accion, enviando] = useActionState(ingresar, null);
  const restante = useCuentaRegresiva(estado);

  return (
    <form action={accion} className="mt-8 space-y-5">
      <div>
        <label htmlFor="email" className="etiqueta">Email</label>
        <input id="email" name="email" type="email" required className="campo" autoComplete="email" />
      </div>
      <Mensaje estado={estado} />
      <button type="submit" className="boton w-full" disabled={enviando || restante > 0}>
        {enviando
          ? "Sending..."
          : restante > 0
            ? `You can request a new link in ${restante}s`
            : estado?.ok
              ? "Send a new link"
              : "Email me the link"}
      </button>
    </form>
  );
}
