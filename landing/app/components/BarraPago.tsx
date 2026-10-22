import { formatDia, formatUsd } from "@/lib/format";

// Barra hacia el pago. Aparece recién cuando el referido está contratado: antes, la mayoría no se coloca y una
// cuenta regresiva prometería de más. La usan el panel y la vista previa de la home.
// Los días salen de config (info_programa), como el resto de los números del negocio.

type Props = {
  monto: number;
  total: number; // días desde la contratación hasta el pago
  restantes: number; // días que faltan; 0 o menos: ya se cumplió el plazo y falta la revisión diaria
  estado: string; // contratado | elegible_pago | pagado
  fechaPago?: string | null;
  fechaContratacion?: string | null;
  compacta?: boolean;
};

function frase(avance: number) {
  if (avance >= 80) return "Almost there";
  if (avance >= 50) return "Halfway there";
  return "The countdown is on";
}

export function BarraPago({ monto, total, restantes, estado, fechaPago, fechaContratacion, compacta = false }: Props) {
  const cerrada = estado === "elegible_pago" || estado === "pagado";
  const transcurridos = cerrada ? total : Math.min(total, Math.max(0, total - restantes));
  const avance = Math.round((transcurridos / total) * 100);
  const contando = !cerrada && restantes > 0;
  const faltan = `${restantes} ${restantes === 1 ? "day" : "days"} to go`;

  // Con 0 días transcurridos la barra igual se ve: el conteo ya empezó.
  const barra = (
    <div
      role="progressbar"
      aria-label="Days until payout"
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={transcurridos}
      aria-valuetext={`Day ${transcurridos} of ${total}`}
      className={`overflow-hidden rounded-full bg-white/15 ${compacta ? "h-1.5" : "h-2.5"}`}
    >
      <div
        className="h-full rounded-full bg-linear-to-r from-wt-lima to-[#effcc4] shadow-[0_0_12px_rgba(208,239,118,0.55)] motion-safe:animate-llenar"
        style={{ width: `${Math.max(avance, 3)}%` }}
      />
    </div>
  );

  if (compacta) {
    return (
      <div className="mt-3">
        {barra}
        <div className="mt-1.5 flex justify-between gap-2 text-xs">
          <span className="text-zinc-400">{contando ? frase(avance) : "Payout check in progress"}</span>
          {contando && <span className="font-display text-wt-lima">{faltan}</span>}
        </div>
      </div>
    );
  }

  const [titulo, detalle] = cerrada
    ? estado === "pagado"
      ? ["Paid", "Thank you!"]
      : ["Approved", "Payment is on its way"]
    : contando
      ? [faltan, fechaPago ? `Payout on ${formatDia(fechaPago)}` : ""]
      : [`Day ${total} reached`, "Payout check in progress"];

  return (
    <div className="rounded-xl bg-wt-verde p-4 text-white sm:p-5">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div>
          <p className="font-display text-xs tracking-widest text-zinc-400 uppercase">Your reward</p>
          <p className="mt-1 font-display text-3xl font-bold text-wt-lima tabular-nums">{formatUsd(monto)}</p>
        </div>
        <div className="text-right">
          <p className="font-display text-lg font-semibold">{titulo}</p>
          {detalle && <p className="text-xs text-zinc-400">{detalle}</p>}
        </div>
      </div>
      <div className="mt-4">{barra}</div>
      <div className="mt-2 flex flex-wrap justify-between gap-x-4 gap-y-1 text-xs text-zinc-400">
        <span>
          {fechaContratacion ? `Hired ${formatDia(fechaContratacion)} · ` : ""}day {transcurridos} of {total}
        </span>
        <span className="font-display text-wt-lima">
          {cerrada ? (estado === "pagado" ? "Reward paid ✓" : "Reward approved ✓") : contando ? frase(avance) : "Almost yours"}
        </span>
      </div>
    </div>
  );
}
