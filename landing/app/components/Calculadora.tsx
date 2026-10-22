"use client";

import { useState } from "react";
import { formatUsd } from "@/lib/format";
import { SENIORITY } from "@/lib/textos";

type Props = { montos: Record<string, number>; bono: number; diasHastaPago: number; externosHabilitados: boolean };

const NIVELES = ["junior", "semi_senior", "senior"] as const;

// Calculadora de recompensa: usa los mismos montos de la base que la tabla, así que nunca promete otra cosa.
export function Calculadora({ montos, bono, diasHastaPago, externosHabilitados }: Props) {
  const [nivel, setNivel] = useState<(typeof NIVELES)[number]>("semi_senior");
  const [esWt, setEsWt] = useState(!externosHabilitados);
  const [prioritaria, setPrioritaria] = useState(false);
  const [contrataciones, setContrataciones] = useState(3);

  const porContratacion = montos[`${nivel}:${esWt ? "wt" : "externo"}`] + (prioritaria ? bono : 0);
  const total = porContratacion * contrataciones;

  return (
    <div className="grid gap-8 rounded-3xl bg-wt-verde p-6 text-white sm:p-10 lg:grid-cols-[1.2fr_1fr]">
      <div className="space-y-6">
        <div>
          <p className="font-display text-sm text-zinc-300">Role seniority</p>
          <div className="mt-2 inline-flex rounded-full bg-white/10 p-1">
            {NIVELES.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setNivel(n)}
                className={`rounded-full px-4 py-1.5 font-display text-sm transition ${
                  nivel === n ? "bg-wt-lima text-wt-negro" : "text-zinc-200 hover:text-white"
                }`}
              >
                {SENIORITY[n]}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {externosHabilitados && (
            <Interruptor activo={esWt} onChange={setEsWt} texto="I'm part of WorldTeams (team or professional at a client)" />
          )}
          <Interruptor activo={prioritaria} onChange={setPrioritaria} texto={`Priority role (+${formatUsd(bono)})`} />
        </div>

        <div>
          <label htmlFor="contrataciones" className="font-display text-sm text-zinc-300">
            People you refer who get hired: <strong className="text-white">{contrataciones}</strong>
          </label>
          <input
            id="contrataciones"
            type="range"
            min={1}
            max={10}
            value={contrataciones}
            onChange={(e) => setContrataciones(Number(e.target.value))}
            className="mt-3 w-full accent-wt-lima"
          />
        </div>
      </div>

      <div className="flex flex-col justify-center rounded-2xl bg-white/5 p-6 ring-1 ring-white/10">
        <p className="font-display text-sm text-zinc-300">You could earn</p>
        <p className="mt-1 font-display text-5xl font-bold text-wt-lima tabular-nums">{formatUsd(total)}</p>
        <p className="mt-3 text-sm text-zinc-300">
          {formatUsd(porContratacion)} per hire × {contrataciones}. Each reward is paid once the person completes{" "}
          {diasHastaPago} days on the job.
        </p>
      </div>
    </div>
  );
}

function Interruptor({ activo, onChange, texto }: { activo: boolean; onChange: (v: boolean) => void; texto: string }) {
  return (
    <button type="button" role="switch" aria-checked={activo} onClick={() => onChange(!activo)} className="flex items-center gap-3 text-left text-sm">
      <span className={`relative h-6 w-11 shrink-0 rounded-full transition ${activo ? "bg-wt-lima" : "bg-white/20"}`}>
        <span className={`absolute top-1 size-4 rounded-full bg-wt-negro transition ${activo ? "left-6" : "left-1 bg-white"}`} />
      </span>
      {texto}
    </button>
  );
}
