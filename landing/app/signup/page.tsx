import Link from "next/link";
import { FormRegistro } from "./FormRegistro";

export default function SignupPage() {
  return (
    <main className="mx-auto max-w-lg px-4 py-12">
      <h1 className="text-3xl font-bold">Sign up to refer</h1>
      <p className="mt-2 text-sm text-zinc-600">
        We&apos;ll email you a link to log in, no password needed. Already have an account?{" "}
        <Link href="/login" className="font-medium text-wt-teal hover:underline">Log in</Link>.
      </p>
      <FormRegistro />
    </main>
  );
}
