import Link from "next/link";
import { formatUsd } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { SENIORITY } from "@/lib/textos";
import type { Busqueda, InfoPrograma } from "@/lib/tipos";
import { BarraPago } from "./components/BarraPago";
import { Calculadora } from "./components/Calculadora";
import { Faq } from "./components/Faq";
import { Seguimiento } from "./components/Seguimiento";

// Montos y búsquedas se leen de la base en cada request: si WorldTeams los cambia, la página se actualiza sola.
export const dynamic = "force-dynamic";

function pasos(diasHastaPago: number) {
  return [
    { titulo: "Sign up", texto: "With your email. We send you a link to log in, no password needed." },
    { titulo: "Refer", texto: "Pick an open role and share the person's details and CV." },
    { titulo: "They confirm", texto: "We ask them to opt in. Their CV is scored against the role." },
    { titulo: "You earn", texto: `If they're hired and stay for ${diasHastaPago} days, the reward is yours.` },
  ];
}

export default async function Home() {
  const supabase = await createClient();
  const [{ data, error: errInfo }, { data: busquedas, error: errBusq }] = await Promise.all([
    supabase.rpc("info_programa"),
    supabase
      .from("busquedas")
      .select("id, titulo, especialidad, seniority, descripcion, prioritaria")
      .order("prioritaria", { ascending: false })
      .returns<Busqueda[]>(),
  ]);

  const info = data as InfoPrograma | null;
  if (errInfo || errBusq || !info) {
    throw new Error(`Could not load the program: ${errInfo?.message ?? errBusq?.message}`);
  }

  const maximo = Math.max(...Object.values(info.montos)) + info.bono_prioritaria_usd;

  return (
    <main>
      {/* Hero */}
      <section className="overflow-hidden bg-wt-verde text-white">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-20 lg:grid-cols-[1.3fr_1fr]">
          <div>
            <p className="font-display text-sm tracking-widest text-wt-lima uppercase">Talent Referral Program</p>
            <h1 className="mt-4 text-4xl leading-tight font-bold sm:text-6xl">
              Refer great talent. Earn up to <span className="resaltado">{formatUsd(maximo)}</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg text-zinc-300">
              <strong className="text-white">Know a great architect or engineer in LATAM?</strong> Refer them to work
              with top US firms. If they get hired, you get rewarded — and you can track every step.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link href="/signup" className="boton">Start referring</Link>
              <a href="#roles" className="boton-secundario text-wt-lima">See open roles</a>
            </div>
          </div>

          {/* Vista previa del panel: muestra lo que el referente va a poder seguir después de referir. */}
          <div className="relative">
            <div className="absolute -inset-6 rounded-[2rem] bg-wt-lima/10 blur-2xl" />
            <div className="relative rotate-1 rounded-2xl bg-white/5 p-5 ring-1 ring-white/15 backdrop-blur">
              <p className="font-display text-xs tracking-widest text-zinc-400 uppercase">Your dashboard · example</p>
              {[
                { nombre: "Martín S.", rol: "Revit Specialist", estado: "contratado", restantes: 42, monto: 600 },
                { nombre: "Carla M.", rol: "BIM Coordinator", estado: "en_proceso", nota: "Interviewing", monto: 600 },
              ].map((e) => (
                <div key={e.nombre} className="mt-4 rounded-xl bg-wt-negro/60 p-4">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="font-display font-semibold">
                      {e.nombre} <span className="font-normal text-zinc-400">· {e.rol}</span>
                    </p>
                    <p className="font-display text-sm text-wt-lima">{formatUsd(e.monto)}</p>
                  </div>
                  <div className="mt-3">
                    <Seguimiento estado={e.estado} diasHastaPago={info.dias_hasta_pago} oscuro />
                  </div>
                  {e.restantes != null ? (
                    <BarraPago total={info.dias_hasta_pago} restantes={e.restantes} estado={e.estado} oscuro />
                  ) : (
                    <p className="mt-2 text-xs text-zinc-400">{e.nota}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Cómo funciona */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <p className="font-display text-sm tracking-widest text-zinc-500 uppercase">How it works</p>
        <h2 className="mt-2 text-3xl font-bold sm:text-4xl">
          As easy as 1-2-3-<span className="resaltado">reward</span>
        </h2>
        <ol className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {pasos(info.dias_hasta_pago).map((p, i) => (
            <li key={p.titulo}>
              <span className="flex size-8 items-center justify-center rounded-full bg-wt-negro font-display text-sm font-bold text-white">
                {i + 1}
              </span>
              <h3 className="mt-3 text-lg font-bold">{p.titulo}</h3>
              <p className="mt-1 text-sm text-zinc-600">{p.texto}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Calculadora */}
      <section className="bg-wt-crema">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <p className="font-display text-sm tracking-widest text-zinc-500 uppercase">Reward calculator</p>
          <h2 className="mt-2 text-3xl font-bold sm:text-4xl">How much could you earn?</h2>
          <p className="mt-3 max-w-2xl text-zinc-600">
            Rewards depend on the role&apos;s seniority. People from WorldTeams earn more: you already know what we look
            for.
          </p>
          <div className="mt-8">
            <Calculadora
              montos={info.montos}
              bono={info.bono_prioritaria_usd}
              diasHastaPago={info.dias_hasta_pago}
              externosHabilitados={info.externos_habilitados}
            />
          </div>
        </div>
      </section>

      {/* Búsquedas */}
      <section id="roles" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16">
        <p className="font-display text-sm tracking-widest text-zinc-500 uppercase">Open roles</p>
        <h2 className="mt-2 text-3xl font-bold sm:text-4xl">Who are we looking for?</h2>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {busquedas.map((b) => (
            <li key={b.id} className="group flex flex-col rounded-2xl border border-zinc-200 p-6 transition hover:border-wt-teal hover:shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-lg font-bold">{b.titulo}</h3>
                {b.prioritaria && (
                  <span className="shrink-0 rounded-full bg-wt-lima px-2 py-0.5 font-display text-xs font-medium text-wt-negro">
                    Priority
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-zinc-500">
                {b.especialidad} · {SENIORITY[b.seniority]}
              </p>
              {b.descripcion && <p className="mt-2 flex-1 text-sm text-zinc-600">{b.descripcion}</p>}
              <Link
                href={`/refer?role=${b.id}`}
                className="mt-4 font-display text-sm font-semibold text-wt-teal group-hover:underline"
              >
                Refer someone for this role →
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-4xl px-4 py-16">
        <h2 className="text-3xl font-bold sm:text-4xl">Frequently asked questions</h2>
        <div className="mt-8">
          <Faq info={info} />
        </div>
      </section>

      {/* Cierre */}
      <section className="bg-wt-verde text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-6 px-4 py-14">
          <h2 className="max-w-xl text-3xl font-bold">
            Good people know good people. <span className="text-wt-lima">Start referring today.</span>
          </h2>
          <Link href="/signup" className="boton">Start referring</Link>
        </div>
      </section>
    </main>
  );
}
