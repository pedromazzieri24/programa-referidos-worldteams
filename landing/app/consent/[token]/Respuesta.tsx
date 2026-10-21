"use client";

import { useActionState } from "react";
import { Mensaje } from "../../components/Mensaje";
import { responder } from "./acciones";

export function Respuesta({ token }: { token: string }) {
  const [estado, accion, enviando] = useActionState(responder, null);

  if (estado) return <div className="mt-8"><Mensaje estado={estado} /></div>;

  return (
    <form action={accion} className="mt-8 flex flex-wrap gap-3">
      <input type="hidden" name="token" value={token} />
      <button type="submit" name="respuesta" value="si" className="boton" disabled={enviando}>
        Yes, I&apos;d like to take part
      </button>
      <button type="submit" name="respuesta" value="no" className="boton-secundario" disabled={enviando}>
        No, thanks
      </button>
    </form>
  );
}
