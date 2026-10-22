// Línea de progreso de un referido, tipo "seguimiento de envío". La usan el panel y la vista previa de la home.
// Los días hasta el pago vienen de config (info_programa), como el resto de los números del negocio.

function pasos(diasHastaPago: number) {
  return ["Referred", "Confirmed", "In process", "Hired", `${diasHastaPago} days`, "Paid"];
}

// Hasta qué paso llegó cada estado (índice del último paso completo) y si el recorrido se cortó ahí.
const AVANCE: Record<string, { hecho: number; cortado?: boolean }> = {
  pendiente_consentimiento: { hecho: 0 },
  en_proceso: { hecho: 1 },
  contratado: { hecho: 3 },
  elegible_pago: { hecho: 4 },
  pagado: { hecho: 5 },
  no_confirmado: { hecho: 0, cortado: true },
  descartado: { hecho: 1, cortado: true },
  anulado: { hecho: 3, cortado: true },
};

export function Seguimiento({ estado, diasHastaPago, oscuro = false }: { estado: string; diasHastaPago: number; oscuro?: boolean }) {
  const { hecho, cortado } = AVANCE[estado] ?? { hecho: 0 };
  const lista = pasos(diasHastaPago);

  return (
    <ol className="flex w-full items-start">
      {lista.map((paso, i) => {
        const completo = i <= hecho;
        const actual = i === hecho + 1 && !cortado;
        const corte = cortado && i === hecho + 1;
        // En el celular no entran las seis etiquetas: se ve solo la del paso en que está (o la última, si terminó).
        const visibleEnCelular = actual || corte || (hecho === lista.length - 1 && i === hecho);
        const circulo = completo
          ? "bg-wt-lima border-wt-lima text-wt-negro"
          : corte
            ? "bg-red-500 border-red-500 text-white"
            : actual
              ? `${oscuro ? "border-wt-lima" : "border-wt-negro"} animate-pulse`
              : oscuro ? "border-white/25" : "border-zinc-300";
        return (
          <li key={paso} className="relative flex flex-1 flex-col items-center">
            {i > 0 && (
              <span
                className={`absolute top-2 right-1/2 h-0.5 w-full ${i <= hecho ? "bg-wt-lima" : oscuro ? "bg-white/15" : "bg-zinc-200"}`}
              />
            )}
            <span className={`relative z-10 flex size-4 items-center justify-center rounded-full border-2 text-[9px] font-bold ${circulo}`}>
              {completo ? "✓" : corte ? "×" : ""}
            </span>
            <span
              className={`mt-1.5 text-center text-[11px] leading-tight ${oscuro ? "text-zinc-300" : "text-zinc-500"} ${actual ? "font-semibold" : ""} ${
                visibleEnCelular ? "whitespace-nowrap max-sm:font-semibold sm:whitespace-normal" : "max-sm:hidden"
              }`}
            >
              {paso}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
