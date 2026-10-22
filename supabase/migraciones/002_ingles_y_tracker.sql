-- Migración 002 (20/10): landing en inglés y panel de seguimiento.
-- - Los mensajes de las funciones pasan a inglés y traen un `codigo`: el texto final lo pone la landing.
-- - mis_referidos() suma la recompensa estimada y la fecha de contratación (para el tracker del panel).
-- - Las búsquedas de ejemplo pasan a inglés.
-- Para bases creadas antes de este cambio. Una base nueva ya lo trae en schema.sql y seed.sql.


create or replace function referidos_despues_de_cambio() returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  v_detalle jsonb := '{}';
begin
  if tg_op = 'UPDATE' and new.estado is not distinct from old.estado then
    return new;
  end if;

  if tg_op = 'UPDATE' and new.estado = 'contratado' then
    if new.fecha_contratacion <= new.exclusividad_hasta::date then
      insert into recompensas (referido_id, referente_id, monto_usd, elegible_desde)
      values (new.id, new.referente_id, monto_para(new.id),
              new.fecha_contratacion + cfg('dias_hasta_pago')::int)
      on conflict (referido_id) do nothing;
      insert into tareas (tipo, referido_id) values ('aviso_contratacion', new.id);
    else
      -- Contratado fuera de la ventana de 6 meses: la atribución venció y no hay recompensa.
      v_detalle := jsonb_build_object('reward', 'not applicable: hired outside the attribution window');
    end if;
  end if;

  insert into eventos_referido (referido_id, estado_anterior, estado_nuevo, actor, detalle)
  values (new.id, case when tg_op = 'UPDATE' then old.estado end, new.estado, actor_actual(),
          v_detalle || case when new.motivo_rechazo is not null
                            then jsonb_build_object('motivo', new.motivo_rechazo) else '{}' end);
  return new;
end;
$$;


create or replace function crear_referido(
  p_busqueda_id uuid,
  p_nombre text,
  p_email text,
  p_linkedin_url text,
  p_telefono text,
  p_pais text,
  p_cv_path text
) returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v_ref referentes;
  v_email text := norm_email(p_email);
  v_linkedin text := norm_linkedin(p_linkedin_url);
  v_telefono text := norm_telefono(p_telefono);
  v_cand candidatos;
  v_en_base boolean;
  v_referido_id uuid;
  v_ventana interval := make_interval(months => cfg('ventana_meses')::int);
  v_msg_duplicado constant text := 'This person was already in touch with WorldTeams, so this referral does not count.';
begin
  perform set_config('app.actor', 'referente', true);

  select * into v_ref from referentes where auth_user_id = auth.uid();
  if v_ref.id is null then
    raise exception 'You need to sign up to refer';
  end if;
  if v_email is null or coalesce(trim(p_nombre), '') = '' or p_busqueda_id is null then
    raise exception 'Missing required candidate data (name, email or role)';
  end if;
  -- El CV tiene que estar en la carpeta del propio referente (nadie apunta al archivo de otro).
  if p_cv_path is not null and split_part(p_cv_path, '/', 1) <> auth.uid()::text then
    raise exception 'Invalid CV path';
  end if;

  -- Tope: se cuentan todas las cargas del mes, aceptadas o rechazadas.
  if (select count(*) from intentos_referido
      where referente_id = v_ref.id and created_at >= date_trunc('month', now())) >= cfg('tope_mensual')::int then
    return jsonb_build_object('ok', false, 'motivo', 'tope',
      'mensaje', 'You reached the limit of ' || cfg('tope_mensual') || ' referrals this month. You can refer again next month.');
  end if;

  if exists (select 1 from staff_recruiting where email = v_ref.email) then
    insert into intentos_referido (referente_id, resultado) values (v_ref.id, 'recruiting');
    return jsonb_build_object('ok', false, 'motivo', 'recruiting',
      'mensaje', 'The recruiting team cannot take part in the referral program.');
  end if;

  if grupo_referente(v_ref.id) = 'externo' and not cfg('externos_habilitados')::boolean then
    insert into intentos_referido (referente_id, resultado) values (v_ref.id, 'externos_deshabilitados');
    return jsonb_build_object('ok', false, 'motivo', 'externos_deshabilitados',
      'mensaje', 'For now the program is only open to WorldTeams people.');
  end if;

  if v_email = v_ref.email
     or (v_linkedin is not null and v_linkedin = v_ref.linkedin_norm)
     or (v_telefono is not null and v_telefono = v_ref.telefono_norm) then
    insert into intentos_referido (referente_id, resultado) values (v_ref.id, 'autorreferido');
    return jsonb_build_object('ok', false, 'motivo', 'autorreferido',
      'mensaje', 'You cannot refer yourself.');
  end if;

  if not exists (select 1 from busquedas where id = p_busqueda_id and estado = 'abierta') then
    insert into intentos_referido (referente_id, resultado) values (v_ref.id, 'busqueda_no_disponible');
    return jsonb_build_object('ok', false, 'motivo', 'busqueda_no_disponible',
      'mensaje', 'That role is no longer open.');
  end if;

  -- ¿Ya existe? Por mail o por LinkedIn.
  select * into v_cand from candidatos
  where email_norm = v_email or (v_linkedin is not null and linkedin_norm = v_linkedin)
  limit 1
  for update;

  if v_cand.id is not null then
    -- Estuvo en la base en la ventana si se postuló solo o tuvo un referido que sigue contando.
    -- Los no confirmados no cuentan: el candidato nunca aceptó participar.
    v_en_base := v_cand.postulacion_directa_at > now() - v_ventana
      or exists (select 1 from referidos
                 where candidato_id = v_cand.id
                   and estado <> 'no_confirmado'
                   and exclusividad_hasta > now());
    if v_en_base then
      insert into intentos_referido (referente_id, resultado) values (v_ref.id, 'duplicado');
      return jsonb_build_object('ok', false, 'motivo', 'duplicado', 'mensaje', v_msg_duplicado);
    end if;
  end if;

  begin
    if v_cand.id is null then
      insert into candidatos (nombre, email, email_norm, linkedin_url, linkedin_norm, telefono, telefono_norm,
                              pais, cv_path, origen)
      values (trim(p_nombre), trim(p_email), v_email, p_linkedin_url, v_linkedin, p_telefono, v_telefono,
              p_pais, p_cv_path, 'referido')
      returning * into v_cand;
    else
      -- Estuvo hace más de 6 meses: se actualizan sus datos con los nuevos.
      update candidatos
      set nombre = trim(p_nombre), linkedin_url = coalesce(p_linkedin_url, linkedin_url),
          linkedin_norm = coalesce(v_linkedin, linkedin_norm), telefono = coalesce(p_telefono, telefono),
          telefono_norm = coalesce(v_telefono, telefono_norm), pais = coalesce(p_pais, pais),
          cv_path = p_cv_path, consentimiento_at = null
      where id = v_cand.id;
    end if;

    insert into referidos (referente_id, candidato_id, busqueda_id, token_consentimiento,
                           consentimiento_vence_at, exclusividad_hasta)
    values (v_ref.id, v_cand.id, p_busqueda_id,
            replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''),
            now() + make_interval(days => cfg('dias_consentimiento')::int),
            now() + v_ventana)
    returning id into v_referido_id;
  exception when unique_violation then
    -- Otro referente cargó a la misma persona en el mismo instante: el índice único decide quién llegó primero.
    insert into intentos_referido (referente_id, resultado) values (v_ref.id, 'duplicado');
    return jsonb_build_object('ok', false, 'motivo', 'duplicado', 'mensaje', v_msg_duplicado);
  end;

  insert into tareas (tipo, referido_id) values ('mail_consentimiento', v_referido_id);
  insert into intentos_referido (referente_id, resultado) values (v_ref.id, 'aceptado');

  return jsonb_build_object('ok', true, 'referido_id', v_referido_id,
    'mensaje', 'Done. We emailed ' || trim(p_nombre) || ' to confirm they want to take part.');
end;
$$;


create or replace function confirmar_consentimiento(p_token text) returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v_r referidos;
begin
  perform set_config('app.actor', 'candidato', true);
  select * into v_r from referidos where token_consentimiento = p_token for update;

  if v_r.id is null then
    return jsonb_build_object('ok', false, 'codigo', 'invalid', 'mensaje', 'This link is not valid.');
  elsif v_r.estado <> 'pendiente_consentimiento' then
    -- Idempotente: un segundo clic no cambia nada.
    return case when v_r.estado = 'no_confirmado'
      then jsonb_build_object('ok', false, 'codigo', 'inactive', 'mensaje', 'This link is no longer active.')
      else jsonb_build_object('ok', true, 'codigo', 'already_confirmed', 'mensaje', 'You already confirmed. Thank you!') end;
  elsif v_r.consentimiento_vence_at < now() then
    return jsonb_build_object('ok', false, 'codigo', 'expired', 'mensaje', 'The deadline to confirm has passed.');
  end if;

  update referidos set estado = 'en_proceso' where id = v_r.id;
  update candidatos set consentimiento_at = now() where id = v_r.candidato_id;
  insert into tareas (tipo, referido_id) values ('puntuar_cv', v_r.id);

  return jsonb_build_object('ok', true, 'codigo', 'confirmed',
    'mensaje', 'Thank you! The WorldTeams team will review your profile and get in touch.');
end;
$$;


create or replace function rechazar_consentimiento(p_token text) returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v_r referidos;
begin
  perform set_config('app.actor', 'candidato', true);
  select * into v_r from referidos where token_consentimiento = p_token for update;

  if v_r.id is null then
    return jsonb_build_object('ok', false, 'codigo', 'invalid', 'mensaje', 'This link is not valid.');
  elsif v_r.estado <> 'pendiente_consentimiento' then
    return jsonb_build_object('ok', false, 'codigo', 'inactive', 'mensaje', 'This link is no longer active.');
  end if;

  perform cerrar_no_confirmado(v_r.id, 'rechazó');
  return jsonb_build_object('ok', true, 'codigo', 'declined',
    'mensaje', 'Done, we will not use your data. Thanks for letting us know.');
end;
$$;


create or replace function revision_diaria() returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v_rc record;
  v_aprobadas int := 0;
  v_anuladas int := 0;
  v_vencidos int := 0;
  v_id uuid;
begin
  perform set_config('app.actor', 'sistema', true);

  -- (a) Recompensas que cumplieron los 90 días.
  for v_rc in
    select rc.id, rc.referido_id, r.fecha_baja, rf.activo
    from recompensas rc
    join referidos r on r.id = rc.referido_id
    join referentes rf on rf.id = rc.referente_id
    where rc.estado = 'pendiente' and rc.elegible_desde <= current_date
    for update of rc
  loop
    if v_rc.fecha_baja is null and v_rc.activo then
      -- Se recalcula el monto: si un admin verificó al referente como colocado, ya cobra como WorldTeams.
      update recompensas set estado = 'aprobada', monto_usd = monto_para(v_rc.referido_id) where id = v_rc.id;
      update referidos set estado = 'elegible_pago' where id = v_rc.referido_id;
      insert into tareas (tipo, referido_id) values ('aviso_recompensa_aprobada', v_rc.referido_id);
      v_aprobadas := v_aprobadas + 1;
    else
      update recompensas
      set estado = 'anulada',
          motivo_anulacion = case when v_rc.fecha_baja is not null
                                  then 'The hire left before ' || cfg('dias_hasta_pago') || ' days'
                                  else 'The referrer is no longer active' end
      where id = v_rc.id;
      update referidos set estado = 'anulado' where id = v_rc.referido_id;
      insert into tareas (tipo, referido_id) values ('aviso_recompensa_anulada', v_rc.referido_id);
      v_anuladas := v_anuladas + 1;
    end if;
  end loop;

  -- (b) Consentimientos vencidos.
  for v_id in
    select id from referidos
    where estado = 'pendiente_consentimiento' and consentimiento_vence_at < now()
  loop
    perform cerrar_no_confirmado(v_id, 'venció');
    v_vencidos := v_vencidos + 1;
  end loop;

  return jsonb_build_object('aprobadas', v_aprobadas, 'anuladas', v_anuladas, 'consentimientos_vencidos', v_vencidos);
end;
$$;


-- Cambia lo que devuelve: hay que borrarla y crearla de nuevo.
drop function mis_referidos();
create function mis_referidos()
returns table (
  referido_id uuid,
  candidato text,
  busqueda text,
  estado text,
  motivo text,
  vale_hasta timestamptz,
  recompensa_usd numeric,
  recompensa_estado text,
  elegible_desde date,
  created_at timestamptz,
  recompensa_estimada numeric,   -- lo que cobraría si lo contratan hoy (misma fórmula que la recompensa real)
  fecha_contratacion date
)
language sql stable security definer
set search_path = public
as $$
  select r.id, c.nombre, b.titulo, r.estado, r.motivo_rechazo, r.exclusividad_hasta,
         rc.monto_usd, rc.estado, rc.elegible_desde, r.created_at,
         monto_para(r.id), r.fecha_contratacion
  from referidos r
  join referentes rf on rf.id = r.referente_id
  join candidatos c on c.id = r.candidato_id
  join busquedas b on b.id = r.busqueda_id
  left join recompensas rc on rc.referido_id = r.id
  where rf.auth_user_id = auth.uid()
  order by r.created_at desc
$$;


revoke execute on function mis_referidos() from public, anon;
grant execute on function mis_referidos() to authenticated, service_role;

update busquedas set titulo = 'Senior MEP Engineer', especialidad = 'MEP Engineering',
  descripcion = 'Design of mechanical, electrical and plumbing systems for US commercial buildings. Revit MEP, ASHRAE/NEC codes. Advanced English.'
  where titulo = 'Ingeniero/a MEP Senior';
update busquedas set titulo = 'Revit Specialist', especialidad = 'Architecture / BIM',
  descripcion = 'Architectural modeling in Revit for firms in Texas and Florida. Families, construction documents and coordination with engineering teams. Upper-intermediate English.'
  where titulo = 'Especialista en Revit';
update busquedas set titulo = 'Junior CAD Drafter', especialidad = 'Construction Documents',
  descripcion = 'AutoCAD drafting under supervision. Basic Revit knowledge is a plus. Intermediate English.'
  where titulo = 'Dibujante CAD Junior';
update busquedas set titulo = 'Senior Structural Engineer', especialidad = 'Structural Engineering',
  descripcion = 'Concrete and steel structural design under ACI/AISC codes. ETABS, SAP2000. Advanced English.'
  where titulo = 'Ingeniero/a Estructural Senior';
update busquedas set titulo = 'BIM Coordinator', especialidad = 'BIM',
  descripcion = 'Federated model coordination, clash detection (Navisworks) and BIM standards. Advanced English.'
  where titulo = 'Coordinador/a BIM';
