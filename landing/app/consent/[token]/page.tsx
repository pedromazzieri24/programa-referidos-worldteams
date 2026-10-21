import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Respuesta } from "./Respuesta";

export const dynamic = "force-dynamic";

type Datos = { candidato: string; referente: string; busqueda: string; estado: string; vencido: boolean };

export default async function ConsentPage({ params }: PageProps<"/consent/[token]">) {
  const { token } = await params;
  const supabase = await createClient();
  const { data } = await supabase.rpc("datos_consentimiento", { p_token: token });
  const datos = data as Datos | null;
  if (!datos) notFound();

  const pendiente = datos.estado === "pendiente_consentimiento" && !datos.vencido;

  return (
    <main>
      <section className="bg-wt-verde text-white">
        <div className="mx-auto max-w-2xl px-4 py-14">
          <p className="font-display text-sm tracking-widest text-wt-lima uppercase">You&apos;ve been referred</p>
          <h1 className="mt-3 text-4xl font-bold">Hi {datos.candidato},</h1>
          <p className="mt-4 text-lg text-zinc-200">
            <strong className="text-white">{datos.referente}</strong> thinks you&apos;d be a great fit for our{" "}
            <span className="resaltado">{datos.busqueda}</span> role.
          </p>
        </div>
      </section>
      <section className="mx-auto max-w-2xl px-4 py-10">
        <p className="text-zinc-700">
          WorldTeams connects professionals from LATAM with architecture and engineering firms in the United States —
          remote, in your time zone.
        </p>
        <p className="mt-3 text-sm text-zinc-600">
          We need your OK to move forward: once you confirm, we&apos;ll review the CV that was shared with us and our
          team will reach out. If you&apos;re not interested, we&apos;ll delete your data.
        </p>
        {pendiente ? (
          <Respuesta token={token} />
        ) : (
          <p className="mt-8 rounded-md bg-zinc-100 px-3 py-2 text-sm text-zinc-700">
            {["en_proceso", "contratado", "elegible_pago", "pagado"].includes(datos.estado)
              ? "You already confirmed. Thank you!"
              : "This link is no longer active."}
          </p>
        )}
      </section>
    </main>
  );
}
