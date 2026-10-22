-- Migración 003 (22/10): lo que necesita n8n (Fase 3).
-- - Tabla `errores`: registro de las fallas de los workflows, sin datos personales.
-- - tomar_tareas() retoma una tarea que quedó "en_curso" más de 10 minutos (n8n se cortó a mitad de camino)
--   y devuelve el número de intento, para alertar cuando una tarea agota sus 3 intentos.
-- - tomar_tareas() suma a `datos` las fechas e ids que usan los mails (vencimiento del consentimiento,
--   fecha de pago, id de la recompensa).
-- Para bases creadas antes de este cambio. Una base nueva ya lo trae en schema.sql.

create table errores (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  gravedad text not null default 'critico' check (gravedad in ('critico', 'aviso')),
  workflow text,
  nodo text,
  mensaje text,
  execution_id text,
  execution_url text
);
alter table errores enable row level security;
-- Sin policies: la clave pública no la ve; n8n escribe con la clave secreta.

alter table tareas add column tomada_at timestamptz;

drop index tareas_pendientes_idx;
create index tareas_pendientes_idx on tareas (id) where estado in ('pendiente', 'error', 'en_curso');

drop function tomar_tareas(int);

-- n8n toma hasta p_limite tareas y las marca "en_curso". "skip locked" evita que dos ejecuciones tomen la misma.
-- Reintenta las que fallaron y las que quedaron colgadas más de 10 minutos, hasta 3 intentos en total.
-- Devuelve todo lo que n8n necesita para mandar cada mail.
create function tomar_tareas(p_limite int default 10)
returns table (id bigint, tipo text, referido_id uuid, intento int, payload jsonb, datos jsonb)
language plpgsql security definer
set search_path = public
as $$
begin
  return query
  with tomadas as (
    update tareas t
    set estado = 'en_curso', intentos = t.intentos + 1, tomada_at = now()
    where t.id in (
      select t2.id from tareas t2
      where t2.estado = 'pendiente'
         or (t2.estado = 'error' and t2.intentos < 3)
         or (t2.estado = 'en_curso' and t2.tomada_at < now() - interval '10 minutes' and t2.intentos < 3)
      order by t2.id
      limit p_limite
      for update skip locked)
    returning t.*
  )
  select tm.id, tm.tipo, tm.referido_id, tm.intentos, tm.payload,
         jsonb_build_object(
           'token', r.token_consentimiento,
           'estado', r.estado,
           'motivo', r.motivo_rechazo,
           'vence_at', r.consentimiento_vence_at,
           'candidato_nombre', c.nombre,
           'candidato_email', c.email,
           'cv_path', c.cv_path,
           'referente_nombre', rf.nombre,
           'referente_email', rf.email,
           'busqueda_titulo', b.titulo,
           'busqueda_especialidad', b.especialidad,
           'busqueda_seniority', b.seniority,
           'busqueda_descripcion', b.descripcion,
           'recompensa_id', rc.id,
           'recompensa_usd', rc.monto_usd,
           'recompensa_elegible_desde', rc.elegible_desde,
           'recompensa_motivo', rc.motivo_anulacion)
  from tomadas tm
  left join referidos r on r.id = tm.referido_id
  left join candidatos c on c.id = r.candidato_id
  left join referentes rf on rf.id = r.referente_id
  left join busquedas b on b.id = r.busqueda_id
  left join recompensas rc on rc.referido_id = r.id
  order by tm.id;
end;
$$;

-- Las funciones nuevas se pueden ejecutar desde cualquier rol: se cierra y se abre solo para n8n.
revoke execute on function tomar_tareas(int) from public, anon, authenticated;
grant execute on function tomar_tareas(int) to service_role;
