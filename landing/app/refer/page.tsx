import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SENIORITY } from "@/lib/textos";
import type { Busqueda } from "@/lib/tipos";
import { AvisoIngreso } from "../components/AvisoIngreso";
import { FormReferir } from "./FormReferir";

export const dynamic = "force-dynamic";

export default async function ReferPage({ searchParams }: PageProps<"/refer">) {
  const { role, welcome } = await searchParams;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims.sub) redirect("/login");

  const [{ data: busquedas }, { data: cupoData }] = await Promise.all([
    supabase
      .from("busquedas")
      .select("id, titulo, especialidad, seniority, descripcion, prioritaria")
      .order("titulo")
      .returns<Busqueda[]>(),
    supabase.rpc("cupo_restante"),
  ]);
  const cupo = cupoData as number | null;

  const opciones = (busquedas ?? []).map((b) => ({
    id: b.id,
    texto: `${b.titulo} · ${SENIORITY[b.seniority]}${b.prioritaria ? " · Priority" : ""}`,
  }));
  // La búsqueda elegida desde la tarjeta de la home ("Refer someone for this role").
  const preseleccion = typeof role === "string" && opciones.some((o) => o.id === role) ? role : "";

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      {welcome && <AvisoIngreso />}
      <h1 className="text-3xl font-bold">Refer someone</h1>
      <p className="mt-2 text-sm text-zinc-600">
        We&apos;ll email them to confirm they want to take part. We don&apos;t use their data until they say yes.
      </p>
      <p className="mt-4 text-sm">
        You have <strong>{cupo ?? 0}</strong> referrals left this month ·{" "}
        <Link href="/my-referrals" className="font-medium text-wt-teal hover:underline">See my referrals</Link>
      </p>
      {cupo === 0 ? (
        <p className="mt-8 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
          You reached this month&apos;s limit. You can refer again next month.
        </p>
      ) : (
        <FormReferir busquedas={opciones} preseleccion={preseleccion} />
      )}
    </main>
  );
}
