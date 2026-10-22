import Link from "next/link";
import { FormLogin } from "./FormLogin";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { error } = await searchParams;

  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-3xl font-bold">Log in</h1>
      <p className="mt-2 text-sm text-zinc-600">
        We&apos;ll email you a link. Not signed up yet?{" "}
        <Link href="/signup" className="font-medium text-wt-teal hover:underline">Sign up</Link>.
      </p>
      {error === "link" && (
        <p className="mt-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
          The link expired, was already used, or was opened in a different browser. Request a new one.
        </p>
      )}
      <FormLogin />
    </main>
  );
}
