-- Migración 004 (22/10): arreglos de una review externa del repo.
-- - Zona horaria del programa (Florida, en config): el "hoy" y el "mes" de las reglas dejan de ser los de UTC.
--   Antes, el cupo se reiniciaba a las 21 h de Argentina y una contratación cargada de noche quedaba con la
--   fecha del día siguiente.
-- - crear_referido(): los pedidos del mismo referente van de a uno (dos cargas simultáneas podían pasar el tope);
--   si el mail coincide con un candidato y el LinkedIn con otro, es duplicado (antes elegía uno al azar);
--   al volver a referir a alguien, se encola el borrado de su CV anterior (antes quedaba huérfano).
-- - Solo se contrata a un referido en proceso, también con un cambio a mano (antes generaba la recompensa
--   aunque el candidato no hubiera dado su consentimiento).
-- Para bases creadas antes de este cambio. Una base nueva ya lo trae en schema.sql.

insert into config (clave, valor, descripcion) values
  ('zona_horaria', 'America/New_York', 'Zona de WorldTeams (Florida): define el "hoy" y el "mes" de las reglas')
on conflict (clave) do nothing;

create or replace function hoy() returns date
language sql stable
set search_path = public
as $$ select (now() at time zone cfg('zona_horaria'))::date $$;

create or replace function inicio_mes() returns timestamptz
language sql stable
set search_path = public
as $$ select date_trunc('month', now() at time zone cfg('zona_horaria')) at time zone cfg('zona_horaria') $$;

create or replace function referidos_antes_de_cambio() returns trigger
language plpgsql
as $$
begin
  -- Solo se contrata a quien está en proceso (es decir, confirmó). Vale también para un cambio a mano en Supabase:
  -- sin esto, pasar a "contratado" a alguien que nunca dio su consentimiento igual generaba la recompensa.
  if new.estado = 'contratado' and old.estado is distinct from 'contratado' and old.estado <> 'en_proceso' then
    raise exception 'Solo se puede contratar a un referido en proceso (este está en %)', old.estado;
  end if;
  if new.estado = 'contratado' and new.fecha_contratacion is null then
    new.fecha_contratacion := hoy();
  end if;
  new.updated_at := now();
  return new;
end;
$$;

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
    if new.fecha_contratacion <= (new.exclusividad_hasta at time zone cfg('zona_horaria'))::date then
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
  v_coinciden int;
  v_cv_anterior text;
  v_en_base boolean;
  v_referido_id uuid;
  v_ventana interval := make_interval(months => cfg('ventana_meses')::int);
  v_msg_duplicado constant text := 'This person was already in touch with WorldTeams, so this referral does not count.';
begin
  perform set_config('app.actor', 'referente', true);

  -- "for update": los pedidos del mismo referente van de a uno. Sin esto, dos cargas simultáneas cuentan el mismo
  -- cupo y pasan las dos el tope.
  select * into v_ref from referentes where auth_user_id = auth.uid() for update;
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
      where referente_id = v_ref.id and created_at >= inicio_mes()) >= cfg('tope_mensual')::int then
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

  -- ¿Ya existe? Por mail o por LinkedIn. Si el mail coincide con un candidato y el LinkedIn con otro, no se puede
  -- saber a cuál corresponde: se trata como duplicado en lugar de elegir uno al azar.
  select count(*) into v_coinciden from candidatos
  where email_norm = v_email or (v_linkedin is not null and linkedin_norm = v_linkedin);
  if v_coinciden > 1 then
    insert into intentos_referido (referente_id, resultado) values (v_ref.id, 'duplicado');
    return jsonb_build_object('ok', false, 'motivo', 'duplicado', 'mensaje', v_msg_duplicado);
  end if;

  select * into v_cand from candidatos
  where email_norm = v_email or (v_linkedin is not null and linkedin_norm = v_linkedin)
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
      -- Estuvo hace más de 6 meses: se actualizan sus datos con los nuevos, salvo el mail.
      -- Riesgo conocido (nota de decisiones): si volvió con otro mail, el consentimiento va al viejo.
      -- El CV anterior se reemplaza por el nuevo: más abajo se encola su borrado para que no quede huérfano.
      v_cv_anterior := v_cand.cv_path;
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
  if v_cv_anterior is not null and v_cv_anterior is distinct from p_cv_path then
    insert into tareas (tipo, referido_id, payload)
    values ('borrar_cv', v_referido_id, jsonb_build_object('cv_path', v_cv_anterior));
  end if;
  insert into intentos_referido (referente_id, resultado) values (v_ref.id, 'aceptado');

  return jsonb_build_object('ok', true, 'referido_id', v_referido_id,
    'mensaje', 'Done. We emailed ' || trim(p_nombre) || ' to confirm they want to take part.');
end;
$$;

create or replace function cupo_restante() returns int
language sql stable security definer
set search_path = public
as $$
  select greatest(cfg('tope_mensual')::int - count(*)::int, 0)
  from intentos_referido i
  join referentes rf on rf.id = i.referente_id
  where rf.auth_user_id = auth.uid() and i.created_at >= inicio_mes()
$$;

create or replace function marcar_contratado(p_referido_id uuid, p_fecha date default hoy()) returns void
language plpgsql security definer
set search_path = public
as $$
begin
  perform set_config('app.actor', 'staff', true);
  update referidos set estado = 'contratado', fecha_contratacion = p_fecha
  where id = p_referido_id and estado = 'en_proceso';
  if not found then
    raise exception 'El referido % no está en proceso', p_referido_id;
  end if;
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
    where rc.estado = 'pendiente' and rc.elegible_desde <= hoy()
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

-- Permisos: las funciones nuevas, como el resto, no las ejecuta la clave pública.
revoke execute on function hoy(), inicio_mes() from public, anon, authenticated;
grant execute on function hoy(), inicio_mes() to service_role;
