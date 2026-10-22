import Link from "next/link";
import { redirect } from "next/navigation";
import { diasHasta, formatDia, formatFecha, formatUsd } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { ESTADOS, MOTIVOS, TIPO_REFERENTE } from "@/lib/textos";
import type { InfoPrograma, MiReferido, Perfil } from "@/lib/tipos";
import { AvisoIngreso } from "../components/AvisoIngreso";
import { BarraPago } from "../components/BarraPago";
import { Seguimiento } from "../components/Seguimiento";

export const dynamic = "force-dynamic";

const ACTIVOS = ["pendiente_consentimiento", "en_proceso", "contratado"];

// Desde la contratación (con recompensa) el referido muestra la línea de meta hacia el pago, al lado del monto.
function conBarra(r: MiReferido) {
  return r.estado === "elegible_pago" || r.estado === "pagado" || (r.estado === "contratado" && r.elegible_desde != null);
}

// La línea de abajo de cada referido: qué sigue, en una frase.
function proximoPaso(r: MiReferido, diasHastaPago: number) {
  switch (r.estado) {
    case "pendiente_consentimiento":
      return `We emailed them to confirm. Your referral is valid until ${formatFecha(r.vale_hasta)}.`;
    case "en_proceso":
      return `They're in the selection process. Valid until ${formatFecha(r.vale_hasta)}.`;
    case "contratado": {
      if (!r.elegible_desde) return "Hired outside the referral window: no reward for this one.";
      const contratado = r.fecha_contratacion ? `Hired ${formatDia(r.fecha_contratacion)}. ` : "";
      return diasHasta(r.elegible_desde) > 0
        ? `${contratado}Payout on ${formatDia(r.elegible_desde)}.`
        : `${contratado}Payout check in progress.`;
    }
    case "elegible_pago":
      return "Your reward is approved. Payment is on its way.";
    case "pagado":
      return "Reward paid. Thank you!";
    case "no_confirmado":
      return MOTIVOS[r.motivo ?? ""] ?? "They didn't confirm.";
    case "descartado":
      return "They didn't move forward in this process.";
    case "anulado":
      return `They left before ${diasHastaPago} days, so the reward was voided.`;
    default:
      return "";
  }
}

function Tarjeta({ titulo, valor, nota, destacada = false }: { titulo: string; valor: string; nota?: string; destacada?: boolean }) {
  return (
    <div className={`rounded-2xl p-5 ${destacada ? "bg-wt-verde text-white" : "bg-wt-crema"}`}>
      <p className={`font-display text-sm ${destacada ? "text-zinc-300" : "text-zinc-600"}`}>{titulo}</p>
      <p className={`mt-1 font-display text-3xl font-bold tabular-nums ${destacada ? "text-wt-lima" : ""}`}>{valor}</p>
      {nota && <p className={`mt-1 text-xs ${destacada ? "text-zinc-400" : "text-zinc-500"}`}>{nota}</p>}
    </div>
  );
}

export default async function MyReferralsPage({ searchParams }: PageProps<"/my-referrals">) {
  const { welcome } = await searchParams;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims.sub) redirect("/login");

  const [{ data: perfil }, { data, error }, { data: cupoData }, { data: infoData }] = await Promise.all([
    supabase.from("referentes").select("nombre, tipo, tipo_verificado, codigo_ref").maybeSingle<Perfil>(),
    supabase.rpc("mis_referidos"),
    supabase.rpc("cupo_restante"),
    supabase.rpc("info_programa"),
  ]);
  const info = infoData as InfoPrograma | null;
  // Sin info_programa no hay de dónde sacar el tope ni los días hasta el pago: mejor un error que un número inventado.
  if (error || !info) throw new Error(`Could not load your referrals: ${error?.message ?? "missing program info"}`);
  const referidos = (data ?? []) as MiReferido[];
  const cupo = (cupoData as number | null) ?? 0;
  const tope = info.tope_mensual;

  // Potencial: lo que podrías cobrar por los que siguen en carrera. Ganado: lo aprobado o pagado.
  const potencial = referidos
    .filter((r) => ACTIVOS.includes(r.estado))
    .reduce((t, r) => t + (r.recompensa_usd ?? (r.estado === "contratado" ? 0 : r.recompensa_estimada ?? 0)), 0);
  const ganado = referidos
    .filter((r) => r.recompensa_estado === "aprobada" || r.recompensa_estado === "pagada")
    .reduce((t, r) => t + (r.recompensa_usd ?? 0), 0);

  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      {welcome && <AvisoIngreso />}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">My referrals</h1>
          {perfil && (
            <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-zinc-600">
              {perfil.nombre} · {TIPO_REFERENTE[perfil.tipo]}
              {perfil.tipo !== "externo" &&
                (perfil.tipo_verificado ? (
                  <span className="rounded-full bg-wt-lima px-2 py-0.5 text-xs text-wt-negro">verified</span>
                ) : (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-900">
                    not verified yet: external rates apply until WorldTeams confirms it
                  </span>
                ))}
              <span className="font-mono text-xs text-zinc-400">#{perfil.codigo_ref}</span>
            </p>
          )}
        </div>
        {/* Sin referidos, el botón ya está en el recuadro vacío de abajo. */}
        {referidos.length > 0 && <Link href="/refer" className="boton">Refer someone</Link>}
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tarjeta titulo="This month" valor={`${tope - cupo}/${tope}`} nota="referrals used" />
        <Tarjeta titulo="In progress" valor={String(referidos.filter((r) => ACTIVOS.includes(r.estado)).length)} nota="still in the race" />
        <Tarjeta titulo="Potential rewards" valor={formatUsd(potencial)} nota="if your active referrals get hired" />
        <Tarjeta titulo="Earned" valor={formatUsd(ganado)} nota="approved or paid" destacada />
      </div>

      {referidos.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-zinc-300 p-10 text-center">
          <p className="font-display text-lg font-semibold">No referrals yet</p>
          <p className="mt-1 text-sm text-zinc-600">Know someone great? It takes two minutes.</p>
          <Link href="/refer" className="boton mt-4">Refer someone</Link>
        </div>
      ) : (
        <ul className="mt-10 space-y-4">
          {referidos.map((r) => {
            const estado = ESTADOS[r.estado] ?? { texto: r.estado, color: "bg-zinc-100" };
            const monto = r.recompensa_usd ?? r.recompensa_estimada;
            const barra = conBarra(r);
            // En pantalla ancha, dos columnas: la línea de meta usa el espacio libre a la derecha y la tarjeta no crece.
            return (
              <li
                key={r.referido_id}
                className="grid gap-x-10 gap-y-5 rounded-2xl border border-zinc-200 p-5 lg:grid-cols-[minmax(0,1fr)_16rem]"
              >
                <div>
                  <p className="font-display text-lg font-semibold">{r.candidato}</p>
                  <p className="text-sm text-zinc-500">
                    {r.busqueda} · referred {formatFecha(r.created_at)}
                  </p>
                </div>
                <div className="lg:row-span-2 lg:text-right">
                  <span className={`rounded-full px-2.5 py-1 font-display text-xs font-medium ${estado.color}`}>{estado.texto}</span>
                  {monto != null && (
                    <p className={`mt-2 font-display text-sm ${r.estado === "anulado" ? "text-zinc-400 line-through" : ""}`}>
                      {formatUsd(monto)}
                      <span className="text-zinc-500">{r.recompensa_usd == null ? " potential" : ""}</span>
                    </p>
                  )}
                  {barra && (
                    <BarraPago
                      total={info.dias_hasta_pago}
                      restantes={r.elegible_desde ? diasHasta(r.elegible_desde) : 0}
                      estado={r.estado}
                    />
                  )}
                </div>
                <div>
                  <div className="max-w-3xl">
                    <Seguimiento estado={r.estado} diasHastaPago={info.dias_hasta_pago} />
                  </div>
                  <p className="mt-3 text-sm text-zinc-600">{proximoPaso(r, info.dias_hasta_pago)}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
