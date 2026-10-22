// Vercel corre en UTC: se fija la zona de Argentina para que la fecha no se corra un día.
const fechaFormat = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeZone: "America/Argentina/Buenos_Aires",
});

export function formatFecha(iso: string) {
  return fechaFormat.format(new Date(iso));
}

// Las columnas `date` llegan como "2026-10-20": se fija el mediodía para que la zona horaria no corra el día.
export function formatDia(dia: string) {
  return fechaFormat.format(new Date(`${dia}T12:00:00Z`));
}

export function formatUsd(monto: number) {
  return `USD ${monto.toLocaleString("en-US")}`;
}

// Días que faltan hasta una fecha (`date`), contando desde hoy en Argentina.
export function diasHasta(dia: string) {
  const hoy = new Date(new Date().toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }));
  return Math.round((new Date(dia).getTime() - hoy.getTime()) / 86_400_000);
}
