// Respuesta de las Server Actions de los formularios.
// `esperar`: segundos hasta poder pedir otro magic link (Supabase permite uno por minuto por mail).
export type EstadoForm = { ok: boolean; mensaje: string; esperar?: number } | null;

// Fila de la función mis_referidos() en Supabase.
export type MiReferido = {
  referido_id: string;
  candidato: string;
  busqueda: string;
  estado: string;
  motivo: string | null;
  vale_hasta: string;
  recompensa_usd: number | null;
  recompensa_estado: string | null;
  elegible_desde: string | null;
  created_at: string;
  recompensa_estimada: number | null;
  fecha_contratacion: string | null;
};

export type Perfil = {
  nombre: string;
  tipo: "interno" | "colocado" | "externo";
  tipo_verificado: boolean;
  codigo_ref: string;
};

export type Busqueda = {
  id: string;
  titulo: string;
  especialidad: string;
  seniority: "junior" | "semi_senior" | "senior";
  descripcion: string | null;
  prioritaria: boolean;
};

// Respuesta de info_programa(): montos indexados por "seniority:grupo".
export type InfoPrograma = {
  montos: Record<string, number>;
  bono_prioritaria_usd: number;
  tope_mensual: number;
  dias_hasta_pago: number;
  dias_consentimiento: number;
  ventana_meses: number;
  externos_habilitados: boolean;
};
