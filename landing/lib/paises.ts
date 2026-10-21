// Países del formulario: LATAM primero (de donde vienen los profesionales), después EE. UU. y "Other".
// Se guarda el código (AR, MX...) para que el dato quede limpio y sirva para métricas por país.
export type Pais = { codigo: string; nombre: string; prefijo: string; bandera: string };

export const PAISES: Pais[] = [
  { codigo: "AR", nombre: "Argentina", prefijo: "+54", bandera: "🇦🇷" },
  { codigo: "BO", nombre: "Bolivia", prefijo: "+591", bandera: "🇧🇴" },
  { codigo: "BR", nombre: "Brazil", prefijo: "+55", bandera: "🇧🇷" },
  { codigo: "CL", nombre: "Chile", prefijo: "+56", bandera: "🇨🇱" },
  { codigo: "CO", nombre: "Colombia", prefijo: "+57", bandera: "🇨🇴" },
  { codigo: "CR", nombre: "Costa Rica", prefijo: "+506", bandera: "🇨🇷" },
  { codigo: "DO", nombre: "Dominican Republic", prefijo: "+1", bandera: "🇩🇴" },
  { codigo: "EC", nombre: "Ecuador", prefijo: "+593", bandera: "🇪🇨" },
  { codigo: "SV", nombre: "El Salvador", prefijo: "+503", bandera: "🇸🇻" },
  { codigo: "GT", nombre: "Guatemala", prefijo: "+502", bandera: "🇬🇹" },
  { codigo: "HN", nombre: "Honduras", prefijo: "+504", bandera: "🇭🇳" },
  { codigo: "MX", nombre: "Mexico", prefijo: "+52", bandera: "🇲🇽" },
  { codigo: "NI", nombre: "Nicaragua", prefijo: "+505", bandera: "🇳🇮" },
  { codigo: "PA", nombre: "Panama", prefijo: "+507", bandera: "🇵🇦" },
  { codigo: "PY", nombre: "Paraguay", prefijo: "+595", bandera: "🇵🇾" },
  { codigo: "PE", nombre: "Peru", prefijo: "+51", bandera: "🇵🇪" },
  { codigo: "PR", nombre: "Puerto Rico", prefijo: "+1", bandera: "🇵🇷" },
  { codigo: "UY", nombre: "Uruguay", prefijo: "+598", bandera: "🇺🇾" },
  { codigo: "VE", nombre: "Venezuela", prefijo: "+58", bandera: "🇻🇪" },
  { codigo: "US", nombre: "United States", prefijo: "+1", bandera: "🇺🇸" },
  { codigo: "OTHER", nombre: "Other country", prefijo: "+", bandera: "🌎" },
];

export function buscarPais(codigo: string | null | undefined) {
  return PAISES.find((p) => p.codigo === codigo);
}
