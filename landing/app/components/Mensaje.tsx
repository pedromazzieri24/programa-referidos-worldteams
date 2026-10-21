import type { EstadoForm } from "@/lib/tipos";

// Resultado de un formulario: verde si salió bien, rojo si no.
export function Mensaje({ estado }: { estado: EstadoForm }) {
  if (!estado) return null;
  return (
    <p
      role="status"
      className={`rounded-md px-3 py-2 text-sm ${
        estado.ok ? "bg-emerald-50 text-emerald-900" : "bg-red-50 text-red-900"
      }`}
    >
      {estado.mensaje}
    </p>
  );
}
