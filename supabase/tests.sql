-- Tests de las reglas del programa. Correr en el SQL Editor después de schema.sql y seed.sql.
-- Crea usuarios y candidatos de prueba (@test.invalid), ejercita cada regla, borra todo lo que creó
-- y termina con una tabla: cada fila es un caso y la columna `ok` tiene que dar true en todos.

create temp table resultados (n serial, caso text, ok boolean, detalle text);

-- tomar_tareas() no distingue las tareas del test de las reales: toma todas las pendientes.
-- Se guarda cómo estaba la cola para devolverle a n8n, al final, las tareas reales que tomó el test.
create temp table tareas_antes as select id, estado, intentos, tomada_at, clock_timestamp() as inicio from tareas;

create function pg_temp.chk(p_caso text, p_ok boolean, p_detalle text default null) returns void
language sql as $$ insert into resultados (caso, ok, detalle) values (p_caso, coalesce(p_ok, false), p_detalle) $$;

-- Simula la sesión de un usuario: auth.uid() lee este valor.
create function pg_temp.como(p_user uuid) returns void
language sql as $$ select set_config('request.jwt.claim.sub', coalesce(p_user::text, ''), false) $$;

create function pg_temp.usuario(p_id uuid, p_email text, p_meta jsonb, p_confirmado boolean default true) returns void
language sql as $$
  insert into auth.users (id, email, raw_user_meta_data, email_confirmed_at, aud, role)
  values (p_id, p_email, p_meta, case when p_confirmado then now() end, 'authenticated', 'authenticated')
$$;

do $$
declare
  u_lucia   uuid := '00000000-0000-4000-8000-000000000001';
  u_ext     uuid := '00000000-0000-4000-8000-000000000002';
  u_recru   uuid := '00000000-0000-4000-8000-000000000003';
  u_tope    uuid := '00000000-0000-4000-8000-000000000004';
  u_sinconf uuid := '00000000-0000-4000-8000-000000000005';
  b_mep uuid := (select id from busquedas where titulo = 'Senior MEP Engineer');
  b_revit uuid := (select id from busquedas where titulo = 'Revit Specialist');
  r jsonb;
  v_ref referentes;
  v_martin uuid;
  v_valen uuid;
  v_otro uuid;
  v_token text;
  v_rc recompensas;
  i int;
begin
  -- ---------- Registro (P1: el tipo sale del dominio del mail) ----------
  perform pg_temp.usuario(u_lucia, 'lucia.test@worldteams.com',
    '{"nombre":"Lucía Test","tipo_declarado":"colocado","telefono":"+54 9 351 555-0001","linkedin_url":"https://linkedin.com/in/lucia-test"}');
  perform pg_temp.usuario(u_ext, 'externo.test@test.invalid', '{"nombre":"Ext Test","tipo_declarado":"colocado"}');
  perform pg_temp.usuario(u_recru, 'recruiter.demo@worldteams.com', '{"nombre":"Recruiter Demo"}');
  perform pg_temp.usuario(u_tope, 'tope.test@test.invalid', '{"nombre":"Tope Test"}');
  perform pg_temp.usuario(u_sinconf, 'sinconfirmar.test@test.invalid', '{"nombre":"Sin Confirmar"}', false);

  select * into v_ref from referentes where auth_user_id = u_lucia;
  perform pg_temp.chk('P1: mail corporativo → colocado verificado (grupo wt)',
    v_ref.tipo = 'colocado' and v_ref.tipo_verificado and grupo_referente(v_ref.id) = 'wt');
  select * into v_ref from referentes where auth_user_id = u_ext;
  perform pg_temp.chk('P1: dice ser colocado sin mail corporativo → sin verificar (grupo externo)',
    v_ref.tipo = 'colocado' and not v_ref.tipo_verificado and grupo_referente(v_ref.id) = 'externo');
  perform pg_temp.chk('Sin confirmar el mail no se crea el referente',
    not exists (select 1 from referentes where auth_user_id = u_sinconf));

  -- ---------- Alta de referidos ----------
  perform pg_temp.como(u_lucia);
  r := crear_referido(b_mep, 'Martín Sosa', 'Martin.Sosa@test.invalid', 'https://www.linkedin.com/in/martin-sosa/', null, 'Argentina',
                      u_lucia::text || '/cv-martin.pdf');
  v_martin := (r ->> 'referido_id')::uuid;
  perform pg_temp.chk('Lucía refiere a Martín → ok, esperando confirmación, mail encolado',
    (r ->> 'ok')::boolean
    and (select estado from referidos where id = v_martin) = 'pendiente_consentimiento'
    and exists (select 1 from tareas where referido_id = v_martin and tipo = 'mail_consentimiento'), r::text);

  r := crear_referido(b_mep, 'Lucía', 'lucia.test@worldteams.com', null, null, null, null);
  perform pg_temp.chk('Autorreferido por mail → rechazado', r ->> 'motivo' = 'autorreferido', r::text);
  r := crear_referido(b_mep, 'Lucía', 'otra@test.invalid', 'linkedin.com/in/LUCIA-TEST?trk=x', null, null, null);
  perform pg_temp.chk('Autorreferido por LinkedIn escrito distinto → rechazado', r ->> 'motivo' = 'autorreferido', r::text);
  r := crear_referido(b_mep, 'Lucía', 'otra2@test.invalid', null, '+54 (351) 555 0001 ', null, null);
  perform pg_temp.chk('Autorreferido por teléfono → rechazado', r ->> 'motivo' = 'autorreferido', r::text);
  -- Este caso tiene que tirar error. Va en un sub-bloque: un "exception" deshace solo lo de su propio bloque.
  begin
    r := crear_referido(b_mep, 'Martín', 'martin@test.invalid', null, null, null, u_ext::text || '/x.pdf');
    perform pg_temp.chk('CV en la carpeta de otro usuario → error', false, 'no debería llegar acá');
  exception when others then
    perform pg_temp.chk('CV en la carpeta de otro usuario → error', sqlerrm = 'Invalid CV path', sqlerrm);
  end;
end $$;

do $$
declare
  u_lucia   uuid := '00000000-0000-4000-8000-000000000001';
  u_ext     uuid := '00000000-0000-4000-8000-000000000002';
  u_recru   uuid := '00000000-0000-4000-8000-000000000003';
  u_tope    uuid := '00000000-0000-4000-8000-000000000004';
  b_mep uuid := (select id from busquedas where titulo = 'Senior MEP Engineer');
  b_revit uuid := (select id from busquedas where titulo = 'Revit Specialist');
  r jsonb;
  v_martin uuid := (select r.id from referidos r join candidatos c on c.id = r.candidato_id
                    where c.email_norm = 'martin.sosa@test.invalid');
  v_valen uuid;
  v_otro uuid;
  v_token text;
  v_rc recompensas;
  i int;
begin
  -- ---------- Duplicados y exclusividad (ventana única de 6 meses) ----------
  perform pg_temp.como(u_ext);
  r := crear_referido(b_mep, 'Martin S', '  MARTIN.SOSA@test.invalid ', null, null, null, null);
  perform pg_temp.chk('Otro referente carga a Martín (mail con mayúsculas y espacios) → duplicado',
    r ->> 'motivo' = 'duplicado', r::text);
  r := crear_referido(b_revit, 'Martín Sosa', 'msosa.otro@test.invalid', 'http://ar.linkedin.com/in/martin-sosa', null, null, null);
  perform pg_temp.chk('Otro referente carga a Martín con otro mail pero el mismo LinkedIn → duplicado',
    r ->> 'motivo' = 'duplicado', r::text);
  perform pg_temp.chk('P4: el mensaje de duplicado no da información del candidato',
    r ->> 'mensaje' = 'This person was already in touch with WorldTeams, so this referral does not count.');
  r := crear_referido(b_revit, 'Carolina Díaz', 'carolina.diaz@example.com', null, null, null, null);
  perform pg_temp.chk('Candidata que se postuló sola hace 2 meses → duplicado', r ->> 'motivo' = 'duplicado', r::text);
  r := crear_referido(b_revit, 'Valentina Ruiz', 'valentina.ruiz@example.com', null, null, null, null);
  v_valen := (r ->> 'referido_id')::uuid;
  perform pg_temp.chk('Candidata que se postuló sola hace 8 meses → se puede referir', (r ->> 'ok')::boolean, r::text);

  -- ---------- Recruiting excluido ----------
  perform pg_temp.como(u_recru);
  r := crear_referido(b_revit, 'Alguien', 'alguien@test.invalid', null, null, null, null);
  perform pg_temp.chk('Usuario de recruiting → rechazado', r ->> 'motivo' = 'recruiting', r::text);

  -- ---------- Tope mensual: cuenta también los rechazados ----------
  perform pg_temp.como(u_tope);
  for i in 1..5 loop
    perform crear_referido(b_revit, 'Tope ' || i, 'tope' || i || '@test.invalid', null, null, null, null);
  end loop;
  for i in 1..5 loop
    perform crear_referido(b_revit, 'Carolina', 'carolina.diaz@example.com', null, null, null, null);  -- duplicados
  end loop;
  r := crear_referido(b_revit, 'Tope 11', 'tope11@test.invalid', null, null, null, null);
  perform pg_temp.chk('P4: carga 11 del mes (5 aceptadas + 5 rechazadas) → tope', r ->> 'motivo' = 'tope', r::text);
  perform pg_temp.chk('cupo_restante() = 0 al llegar al tope', cupo_restante() = 0);

  -- ---------- Consentimiento (P2) ----------
  perform pg_temp.como(null);
  v_token := (select token_consentimiento from referidos where id = v_martin);
  perform pg_temp.chk('La página de consentimiento ve solo nombres de pila, búsqueda y estado',
    datos_consentimiento(v_token) ->> 'referente' = 'Lucía' and datos_consentimiento(v_token) ->> 'busqueda' = 'Senior MEP Engineer');
  r := confirmar_consentimiento(v_token);
  perform pg_temp.chk('Martín confirma → en proceso y CV encolado para puntuar',
    (r ->> 'ok')::boolean and (select estado from referidos where id = v_martin) = 'en_proceso'
    and exists (select 1 from tareas where referido_id = v_martin and tipo = 'puntuar_cv'), r::text);
  r := confirmar_consentimiento(v_token);
  perform pg_temp.chk('Segundo clic en confirmar no cambia nada (código already_confirmed)',
    (select count(*) from tareas where referido_id = v_martin and tipo = 'puntuar_cv') = 1 and r ->> 'codigo' = 'already_confirmed', r::text);

  r := rechazar_consentimiento((select token_consentimiento from referidos where id = v_valen));
  perform pg_temp.chk('P2: Valentina dice "No me interesa" → no confirmado (rechazó) y aviso al referente',
    (select estado || '/' || motivo_rechazo from referidos where id = v_valen) = 'no_confirmado/rechazó'
    and exists (select 1 from tareas where referido_id = v_valen and tipo = 'aviso_no_confirmado'), r::text);

  perform pg_temp.como(u_lucia);
  r := crear_referido(b_revit, 'Valentina Ruiz', 'valentina.ruiz@example.com', null, null, null,
                      u_lucia::text || '/cv-valentina.pdf');
  v_valen := (r ->> 'referido_id')::uuid;
  perform pg_temp.chk('P2: un referido no confirmado no bloquea a otro referente', (r ->> 'ok')::boolean, r::text);

  update referidos set consentimiento_vence_at = now() - interval '1 day' where id = v_valen;
  perform revision_diaria();
  perform pg_temp.chk('P2: sin respuesta en 14 días → no confirmado (venció), CV encolado para borrar',
    (select estado || '/' || motivo_rechazo from referidos where id = v_valen) = 'no_confirmado/venció'
    and exists (select 1 from tareas where referido_id = v_valen and tipo = 'borrar_cv'
                and payload ->> 'cv_path' = u_lucia::text || '/cv-valentina.pdf')
    and (select cv_path from candidatos where email_norm = 'valentina.ruiz@example.com') is null);

  -- ---------- Contratación y recompensa ----------
  perform marcar_contratado(v_martin);
  select * into v_rc from recompensas where referido_id = v_martin;
  perform pg_temp.chk('Contratado → recompensa pendiente: USD 900 (senior, WorldTeams) + 100 (prioritaria)',
    v_rc.estado = 'pendiente' and v_rc.monto_usd = 1000, v_rc.monto_usd::text);
  perform pg_temp.chk('El pago se habilita a los 90 días de la contratación', v_rc.elegible_desde = current_date + 90);

  perform revision_diaria();
  perform pg_temp.chk('Antes de los 90 días la revisión no toca la recompensa',
    (select estado from recompensas where id = v_rc.id) = 'pendiente');

  update recompensas set elegible_desde = current_date where id = v_rc.id;
  perform revision_diaria();
  perform pg_temp.chk('A los 90 días, sin baja → aprobada y referido elegible para pago',
    (select estado from recompensas where id = v_rc.id) = 'aprobada'
    and (select estado from referidos where id = v_martin) = 'elegible_pago'
    and exists (select 1 from tareas where referido_id = v_martin and tipo = 'aviso_recompensa_aprobada'));

  perform marcar_pagada(v_rc.id, 'TRANSF-TEST-001');
  perform pg_temp.chk('Pago registrado → recompensa pagada y referido pagado',
    (select estado from recompensas where id = v_rc.id) = 'pagada'
    and (select estado from referidos where id = v_martin) = 'pagado');

  perform pg_temp.chk('Historial: cada cambio de estado de Martín quedó registrado',
    (select string_agg(estado_nuevo, '>' order by id) from eventos_referido where referido_id = v_martin)
      = 'pendiente_consentimiento>en_proceso>contratado>elegible_pago>pagado',
    (select string_agg(estado_nuevo || ':' || actor, ' > ' order by id) from eventos_referido where referido_id = v_martin));

  -- P5: el contratado se va antes de los 90 días.
  v_otro := (select r.id from referidos r join candidatos c on c.id = r.candidato_id where c.email_norm = 'tope1@test.invalid');
  update referidos set estado = 'en_proceso' where id = v_otro;
  perform marcar_contratado(v_otro);
  update referidos set fecha_baja = current_date where id = v_otro;
  update recompensas set elegible_desde = current_date where referido_id = v_otro;
  perform revision_diaria();
  perform pg_temp.chk('P5: se fue antes de los 90 días → recompensa anulada',
    (select estado from recompensas where referido_id = v_otro) = 'anulada'
    and (select estado from referidos where id = v_otro) = 'anulado');

  -- P5: contratado después de los 6 meses.
  v_otro := (select r.id from referidos r join candidatos c on c.id = r.candidato_id where c.email_norm = 'tope2@test.invalid');
  update referidos set estado = 'en_proceso', exclusividad_hasta = now() - interval '1 day' where id = v_otro;
  perform marcar_contratado(v_otro);
  perform pg_temp.chk('P5: contratado fuera de la ventana de 6 meses → sin recompensa',
    not exists (select 1 from recompensas where referido_id = v_otro));

  -- Un colocado sin verificar cobra como externo: Revit semi senior = USD 400.
  v_otro := (select r.id from referidos r join candidatos c on c.id = r.candidato_id where c.email_norm = 'tope3@test.invalid');
  update referidos set estado = 'en_proceso', referente_id = (select id from referentes where auth_user_id = u_ext) where id = v_otro;
  perform marcar_contratado(v_otro);
  perform pg_temp.chk('P1: colocado sin verificar cobra como externo (USD 400)',
    (select monto_usd from recompensas where referido_id = v_otro) = 400);
  update referentes set tipo_verificado = true where auth_user_id = u_ext;
  update recompensas set elegible_desde = current_date where referido_id = v_otro;
  perform revision_diaria();
  perform pg_temp.chk('P1: si un admin lo verifica antes del pago, cobra como WorldTeams (USD 600)',
    (select monto_usd from recompensas where referido_id = v_otro) = 600);

  -- ---------- Panel del referente y cola de tareas ----------
  perform pg_temp.como(u_lucia);
  perform pg_temp.chk('mis_referidos() muestra solo los de Lucía',
    (select count(*) from mis_referidos()) = 2
    and (select bool_and(candidato in ('Martín Sosa', 'Valentina Ruiz')) from mis_referidos()));
  perform pg_temp.chk('mis_referidos() muestra la recompensa estimada (MEP senior, WorldTeams, prioritaria = USD 1000)',
    (select recompensa_estimada from mis_referidos() where candidato = 'Martín Sosa') = 1000);

  i := (select count(*) from tomar_tareas(1000) where tipo = 'mail_consentimiento' and datos ->> 'candidato_email' is not null);
  perform pg_temp.chk('tomar_tareas() entrega los datos que necesita el mail', i > 0, i::text);
  perform pg_temp.chk('tomar_tareas() no vuelve a entregar una tarea tomada',
    not exists (select 1 from tomar_tareas(1000) where tipo = 'mail_consentimiento'));
  -- n8n se cortó a mitad de camino: la tarea quedó "en_curso" hace más de 10 minutos.
  update tareas set tomada_at = now() - interval '11 minutes'
  where referido_id = v_martin and tipo = 'mail_consentimiento';
  perform pg_temp.chk('tomar_tareas() retoma una tarea colgada más de 10 minutos (segundo intento)',
    exists (select 1 from tomar_tareas(1000) where tipo = 'mail_consentimiento' and referido_id = v_martin and intento = 2));
end $$;

-- ---------- Limpieza: borra todo lo que creó el test ----------
-- Devuelve a la cola las tareas reales que tomó el test, como estaban (el test corre en menos de un segundo:
-- que n8n tome una tarea justo en ese lapso es improbable).
update tareas t set estado = a.estado, intentos = a.intentos, tomada_at = a.tomada_at
from tareas_antes a
where a.id = t.id and t.estado = 'en_curso' and t.tomada_at >= a.inicio;
delete from tareas where referido_id in (select r.id from referidos r join referentes rf on rf.id = r.referente_id
                                         where rf.auth_user_id::text like '00000000-0000-4000-8000-%');
delete from recompensas where referente_id in (select id from referentes where auth_user_id::text like '00000000-0000-4000-8000-%');
delete from referidos where referente_id in (select id from referentes where auth_user_id::text like '00000000-0000-4000-8000-%');
delete from intentos_referido where referente_id in (select id from referentes where auth_user_id::text like '00000000-0000-4000-8000-%');
delete from candidatos where email_norm like '%@test.invalid';
update candidatos set cv_path = null, consentimiento_at = null where email_norm = 'valentina.ruiz@example.com';
delete from auth.users where id::text like '00000000-0000-4000-8000-%';
select set_config('request.jwt.claim.sub', '', false);

select n, ok, caso, detalle from resultados order by n;
