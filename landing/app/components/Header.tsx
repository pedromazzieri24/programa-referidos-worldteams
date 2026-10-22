import Link from "next/link";
import { getUserId } from "@/lib/supabase/server";
import { salir } from "../acciones-auth";
import { LinkAncla } from "./LinkAncla";

export async function Header() {
  const userId = await getUserId();

  return (
    <header className="sticky top-0 z-20 bg-wt-negro/95 text-white backdrop-blur">
      <nav className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="font-display text-xl font-bold tracking-tight">
          WorldTeams<span className="text-wt-lima">.</span>{" "}
          <span className="text-sm font-normal text-zinc-400">Talent Referrals</span>
        </Link>
        <div className="flex items-center gap-5 font-display text-sm">
          <LinkAncla href="/#roles" className="hidden hover:text-wt-lima sm:inline">Open roles</LinkAncla>
          <Link href="/refer" className="hover:text-wt-lima">Refer</Link>
          {userId ? (
            <>
              <Link href="/my-referrals" className="hover:text-wt-lima">My referrals</Link>
              <form action={salir}>
                <button className="text-zinc-400 hover:text-white">Log out</button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="hover:text-wt-lima">Log in</Link>
              <Link href="/signup" className="boton">Sign up</Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
