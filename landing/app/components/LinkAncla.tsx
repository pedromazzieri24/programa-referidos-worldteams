"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Link a una sección de la home (ej. "/#roles"). Si ya estás en la home, desliza hasta la sección
// (la navegación interna de Next no lo hacía en esta página dinámica); desde otra página, navega normal.
export function LinkAncla({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const [ruta, ancla] = href.split("#");

  return (
    <Link
      href={href}
      className={className}
      onClick={(e) => {
        if (pathname !== ruta) return;
        e.preventDefault();
        document.getElementById(ancla)?.scrollIntoView({ behavior: "smooth" });
        history.replaceState(null, "", href);
      }}
    >
      {children}
    </Link>
  );
}
