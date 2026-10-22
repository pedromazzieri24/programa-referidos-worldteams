// Línea de meta hacia el pago: una barra chica, con la meta a cuadros en el día del pago, que entra en la columna
// del estado y el monto sin agrandar la tarjeta. Aparece recién cuando el referido está contratado: antes, la
// mayoría no se coloca y una cuenta regresiva prometería de más. La usan el panel y la vista previa de la home.
// Los días salen de config (info_programa), como el resto de los números del negocio.

type Props = {
  total: number; // días desde la contratación hasta el pago
  restantes: number; // días que faltan; 0 o menos: ya se cumplió el plazo y falta la revisión diaria
  estado: string; // contratado | elegible_pago | pagado
  oscuro?: boolean;
};

function frase(avance: number) {
  if (avance >= 80) return "Almost there";
  if (avance >= 50) return "Halfway there";
  return "The countdown is on";
}

export function BarraPago({ total, restantes, estado, oscuro = false }: Props) {
  const cerrada = estado === "elegible_pago" || estado === "pagado";
  const transcurridos = cerrada ? total : Math.min(total, Math.max(0, total - restantes));
  const avance = Math.round((transcurridos / total) * 100);

  const [izquierda, derecha] = cerrada
    ? ["Goal reached", "✓"]
    : restantes > 0
      ? [frase(avance), `${restantes} ${restantes === 1 ? "day" : "days"} to go`]
      : ["Almost yours", "Payout check"];

  return (
    <div className="mt-3">
      <div
        role="progressbar"
        aria-label="Days until payout"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={transcurridos}
        aria-valuetext={`Day ${transcurridos} of ${total}`}
        className="relative"
      >
        <div className={`h-2 overflow-hidden rounded-full ${oscuro ? "bg-white/15" : "bg-zinc-200"}`}>
          {/* Con 0 días transcurridos la barra igual se ve: el conteo ya empezó. */}
          <div
            className={`h-full rounded-full bg-linear-to-r motion-safe:animate-llenar ${oscuro ? "from-wt-lima to-[#effcc4]" : "from-wt-lima to-wt-teal"}`}
            style={{ width: `${Math.max(avance, 3)}%` }}
          />
        </div>
        {/* La meta: el día del pago. */}
        <span
          aria-hidden
          className="absolute -top-1 right-0 h-4 w-1.5 rounded-[2px] ring-1 ring-black/10"
          style={{ background: "repeating-conic-gradient(#131313 0 25%, #fff 0 50%) 0 0 / 4px 4px" }}
        />
      </div>
      <div className="mt-1.5 flex justify-between gap-3 text-xs">
        <span className={oscuro ? "text-zinc-400" : "text-zinc-500"}>{izquierda}</span>
        <span className={`font-display font-semibold ${oscuro ? "text-wt-lima" : "text-wt-verde"}`}>{derecha}</span>
      </div>
    </div>
  );
}
