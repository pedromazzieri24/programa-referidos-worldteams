import { startTransition, type FormEvent } from "react";

// Con <form action={accion}>, React 19 vacía el formulario al terminar, aunque el servidor lo haya rechazado,
// y había que cargar todo de nuevo (CV incluido). Enviándolo a mano, los datos quedan para corregir y reintentar.
export function enviarSinVaciar(accion: (datos: FormData) => void) {
  return (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const datos = new FormData(e.currentTarget, (e.nativeEvent as SubmitEvent).submitter);
    startTransition(() => accion(datos));
  };
}
