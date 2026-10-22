-- Programa de referidos WorldTeams: tablas, reglas y permisos.
-- Correr una vez en el SQL Editor de Supabase (después, storage.sql y seed.sql).
-- Las reglas de negocio viven acá: la landing solo llama a las funciones (RPC) y n8n procesa la cola `tareas`.

-- ============================================================
-- 1. Configuración: los números del negocio, editables sin migrar
-- ============================================================
create table config (
  clave text primary key,
  valor text not null,
  descripcion text
);

insert into config (clave, valor, descripcion) values
  ('ventana_meses',               '6',              'Duplicado, atribución y plazo para contratar'),
  ('dias_hasta_pago',             '90',             'Días que el contratado tiene que seguir activo'),
  ('tope_mensual',                '10',             'Cargas por referente por mes (cuenta también las rechazadas)'),
  ('dias_consentimiento',         '14',             'Plazo para que el candidato confirme'),
  ('dominios_corporativos',       'worldteams.com', 'Separados por coma: quien se registra con estos dominios es gente de WorldTeams'),
  ('externos_habilitados',        'true',           'false = el programa se cierra a gente de WorldTeams'),
  ('bono_prioritaria_usd',        '100',            'Extra si la búsqueda es prioritaria (perfil escaso)');

create function cfg(p_clave text) returns text
language sql stable
set search_path = public
as $$ select valor from config where clave = p_clave $$;

-- ============================================================
-- 2. Tablas
-- ============================================================

-- Lista que mantiene WorldTeams: quien está acá no puede referir (conflicto de interés).
create table staff_recruiting (
  email text primary key check (email = lower(email)),
  created_at timestamptz not null default now()
);

create table referentes (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users (id) on delete cascade,
  nombre text not null,
  email text not null unique,
  telefono text,
  telefono_norm text,
  linkedin_url text,
  linkedin_norm text,
  pais text,
  area text,
  -- El tipo no se declara: 'interno'/'colocado' verificados salen del dominio del mail (ver handle_new_user).
  tipo text not null check (tipo in ('interno', 'colocado', 'externo')),
  tipo_verificado boolean not null default false,
  codigo_ref text not null unique,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

create table busquedas (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  especialidad text not null,
  seniority text not null check (seniority in ('junior', 'semi_senior', 'senior')),
  descripcion text,
  prioritaria boolean not null default false,
  estado text not null default 'abierta' check (estado in ('abierta', 'cerrada')),
  created_at timestamptz not null default now()
);

create table montos_incentivo (
  seniority text not null check (seniority in ('junior', 'semi_senior', 'senior')),
  grupo_referente text not null check (grupo_referente in ('wt', 'externo')),
  monto_usd numeric(10, 2) not null check (monto_usd >= 0),
  primary key (seniority, grupo_referente)
);

create table candidatos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  email text not null,
  email_norm text not null unique,
  linkedin_url text,
  linkedin_norm text,
  telefono text,
  telefono_norm text,
  pais text,
  cv_path text,
  consentimiento_at timestamptz,
  origen text not null check (origen in ('referido', 'directo')),
  postulacion_directa_at timestamptz,   -- última vez que se postuló solo (cuenta para la ventana de duplicado)
  created_at timestamptz not null default now()
);
-- Dos mails distintos con el mismo LinkedIn son la misma persona.
create unique index candidatos_linkedin_norm_key on candidatos (linkedin_norm) where linkedin_norm is not null;

create table referidos (
  id uuid primary key default gen_random_uuid(),
  referente_id uuid not null references referentes (id),
  candidato_id uuid not null references candidatos (id),
  busqueda_id uuid not null references busquedas (id),
  estado text not null default 'pendiente_consentimiento' check (estado in (
    'pendiente_consentimiento', 'en_proceso', 'contratado', 'elegible_pago', 'pagado',
    'no_confirmado', 'descartado', 'anulado')),
  motivo_rechazo text,
  token_consentimiento text not null unique,
  consentimiento_vence_at timestamptz not null,
  exclusividad_hasta timestamptz not null,
  puntaje_ia int check (puntaje_ia between 1 and 10),
  justificacion_ia text,
  fecha_contratacion date,
  fecha_baja date,                      -- la carga recruiting si el contratado se va
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- La garantía de "un solo referido activo por candidato": aunque dos referentes carguen a la vez, la base rechaza el segundo.
create unique index referidos_un_activo_por_candidato on referidos (candidato_id)
  where estado in ('pendiente_consentimiento', 'en_proceso', 'contratado', 'elegible_pago');
create index referidos_referente_idx on referidos (referente_id);

-- Cada carga cuenta para el tope, aceptada o rechazada. Sin datos del candidato (no dar información de terceros).
create table intentos_referido (
  id bigint generated always as identity primary key,
  referente_id uuid not null references referentes (id),
  resultado text not null check (resultado in (
    'aceptado', 'duplicado', 'autorreferido', 'recruiting', 'busqueda_no_disponible', 'externos_deshabilitados')),
  created_at timestamptz not null default now()
);
create index intentos_referente_fecha_idx on intentos_referido (referente_id, created_at);

-- Historial auditable: una fila por cada cambio de estado (la llena un trigger).
create table eventos_referido (
  id bigint generated always as identity primary key,
  referido_id uuid not null references referidos (id) on delete cascade,
  estado_anterior text,
  estado_nuevo text not null,
  actor text not null,
  detalle jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table recompensas (
  id uuid primary key default gen_random_uuid(),
  referido_id uuid not null unique references referidos (id),
  referente_id uuid not null references referentes (id),
  monto_usd numeric(10, 2) not null,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'aprobada', 'pagada', 'anulada')),
  elegible_desde date not null,
  motivo_anulacion text,
  pagada_at timestamptz,
  referencia_pago text,
  created_at timestamptz not null default now()
);

-- Cola de trabajo para n8n (patrón outbox): la base anota qué hay que hacer y n8n lo hace.
create table tareas (
  id bigint generated always as identity primary key,
  tipo text not null check (tipo in (
    'mail_consentimiento', 'puntuar_cv', 'aviso_contratacion',
    'aviso_recompensa_aprobada', 'aviso_recompensa_anulada', 'aviso_no_confirmado', 'borrar_cv')),
  referido_id uuid references referidos (id),
  payload jsonb not null default '{}',
  estado text not null default 'pendiente' check (estado in ('pendiente', 'en_curso', 'hecha', 'error')),
  intentos int not null default 0,
  error text,
  created_at timestamptz not null default now(),
  tomada_at timestamptz,
  procesada_at timestamptz
);
create index tareas_pendientes_idx on tareas (id) where estado in ('pendiente', 'error', 'en_curso');

-- Registro de las fallas de los workflows de n8n. Sin datos personales: qué falló, dónde y el id de ejecución.
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

-- ============================================================
-- 3. Funciones auxiliares
-- ============================================================

-- Normalización para comparar: mismo dato escrito distinto = misma persona.
create function norm_email(p text) returns text
language sql immutable
as $$ select nullif(lower(trim(p)), '') $$;

-- "https://www.LinkedIn.com/in/Martin-Sosa/?utm=x" → "linkedin.com/in/martin-sosa"
create function norm_linkedin(p text) returns text
language sql immutable
as $$
  select nullif(
    rtrim(
      split_part(split_part(
        regexp_replace(lower(trim(coalesce(p, ''))), '^(https?://)?([a-z]{2,3}\.)?(www\.)?', ''),
      '?', 1), '#', 1),
    '/'),
  '')
$$;

-- Últimos 10 dígitos (código de área + número): "+54 9 351 555-0001" y "(351) 555 0001" dan lo mismo,
-- sin importar el código de país ni el 9 de los celulares argentinos. Con menos de 8 dígitos no alcanza para identificar a nadie.
create function norm_telefono(p text) returns text
language sql immutable
as $$
  select case when length(regexp_replace(coalesce(p, ''), '\D', '', 'g')) >= 8
              then right(regexp_replace(p, '\D', '', 'g'), 10) end
$$;

-- Grupo que define el monto: solo la gente de WorldTeams verificada cobra como 'wt'.
create function grupo_referente(p_referente_id uuid) returns text
language sql stable
set search_path = public
as $$
  select case when tipo in ('interno', 'colocado') and tipo_verificado then 'wt' else 'externo' end
  from referentes where id = p_referente_id
$$;

-- Monto según la seniority de la búsqueda, el grupo del referente y el bono por búsqueda prioritaria.
create function monto_para(p_referido_id uuid) returns numeric
language sql stable
set search_path = public
as $$
  select m.monto_usd + case when b.prioritaria then cfg('bono_prioritaria_usd')::numeric else 0 end
  from referidos r
  join busquedas b on b.id = r.busqueda_id
  join montos_incentivo m on m.seniority = b.seniority and m.grupo_referente = grupo_referente(r.referente_id)
  where r.id = p_referido_id
$$;

-- Quién hizo el cambio, para el historial. Las funciones lo fijan; un cambio a mano en Supabase queda como 'staff'.
create function actor_actual() returns text
language sql stable
as $$ select coalesce(nullif(current_setting('app.actor', true), ''), 'staff') $$;

-- ============================================================
-- 4. Triggers
-- ============================================================

-- Alta del referente cuando confirma su mail (primer clic en el magic link).
-- El tipo sale del dominio: con mail corporativo es gente de WorldTeams verificada;
-- sin él, quien dice ser colocado queda sin verificar (cobra como externo hasta que un admin lo confirme).
create function handle_new_user() returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  v_meta jsonb := coalesce(new.raw_user_meta_data, '{}');
  v_dominio text := split_part(lower(new.email), '@', 2);
  v_corporativo boolean;
  v_declarado text := v_meta ->> 'tipo_declarado';
  v_tipo text;
begin
  if new.email_confirmed_at is null then
    return new;
  end if;

  v_corporativo := v_dominio = any (string_to_array(replace(cfg('dominios_corporativos'), ' ', ''), ','));
  v_tipo := case
    when v_corporativo then (case when v_declarado = 'colocado' then 'colocado' else 'interno' end)
    when v_declarado = 'colocado' then 'colocado'
    else 'externo'
  end;

  insert into referentes (auth_user_id, nombre, email, telefono, telefono_norm, linkedin_url, linkedin_norm,
                          pais, area, tipo, tipo_verificado, codigo_ref)
  values (new.id,
          coalesce(nullif(trim(v_meta ->> 'nombre'), ''), split_part(new.email, '@', 1)),
          lower(new.email),
          v_meta ->> 'telefono', norm_telefono(v_meta ->> 'telefono'),
          v_meta ->> 'linkedin_url', norm_linkedin(v_meta ->> 'linkedin_url'),
          v_meta ->> 'pais', v_meta ->> 'area',
          v_tipo, v_corporativo,
          upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)))
  on conflict (auth_user_id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_confirmado
  after insert or update of email_confirmed_at on auth.users
  for each row execute function handle_new_user();

-- Antes de cambiar de estado: fecha de contratación por defecto y updated_at.
create function referidos_antes_de_cambio() returns trigger
language plpgsql
as $$
begin
  if new.estado = 'contratado' and new.fecha_contratacion is null then
    new.fecha_contratacion := current_date;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger referidos_antes_de_cambio
  before update on referidos
  for each row execute function referidos_antes_de_cambio();

-- Después de cambiar de estado: historial y, si pasó a contratado, la recompensa.
-- Va en un trigger para que funcione igual si recruiting cambia el estado a mano o por marcar_contratado().
create function referidos_despues_de_cambio() returns trigger
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

create trigger referidos_despues_de_cambio
  after insert or update of estado on referidos
  for each row execute function referidos_despues_de_cambio();

-- ============================================================
-- 5. Funciones que llama la landing (RPC)
-- ============================================================

-- Alta de un referido: aplica todas las reglas en una sola transacción.
-- Los rechazos de negocio NO tiran error: devuelven {ok:false, motivo, mensaje}, así el intento queda registrado
-- (un error desharía también el registro del intento y el tope dejaría de contar los rechazados).
create function crear_referido(
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
      -- Estuvo hace más de 6 meses: se actualizan sus datos con los nuevos, salvo el mail.
      -- Riesgo conocido (nota de decisiones): si volvió con otro mail, el consentimiento va al viejo.
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

-- Lo que ve la página de consentimiento: lo mínimo para que el candidato entienda quién lo recomendó y para qué.
create function datos_consentimiento(p_token text) returns jsonb
language sql stable security definer
set search_path = public
as $$
  select jsonb_build_object(
    'candidato', split_part(c.nombre, ' ', 1),
    'referente', split_part(rf.nombre, ' ', 1),
    'busqueda', b.titulo,
    'estado', r.estado,
    'vencido', r.consentimiento_vence_at < now())
  from referidos r
  join candidatos c on c.id = r.candidato_id
  join referentes rf on rf.id = r.referente_id
  join busquedas b on b.id = r.busqueda_id
  where r.token_consentimiento = p_token
$$;

create function confirmar_consentimiento(p_token text) returns jsonb
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

-- Cierra el referido como no confirmado y encola el borrado del CV y el aviso al referente.
-- La usan el botón "No me interesa" y la revisión diaria (vencidos).
create function cerrar_no_confirmado(p_referido_id uuid, p_motivo text) returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_cv text;
begin
  update referidos set estado = 'no_confirmado', motivo_rechazo = p_motivo
  where id = p_referido_id and estado = 'pendiente_consentimiento';
  if not found then
    return;
  end if;

  select c.cv_path into v_cv
  from candidatos c join referidos r on r.candidato_id = c.id
  where r.id = p_referido_id;
  update candidatos set cv_path = null
  where id = (select candidato_id from referidos where id = p_referido_id);

  if v_cv is not null then
    insert into tareas (tipo, referido_id, payload) values ('borrar_cv', p_referido_id, jsonb_build_object('cv_path', v_cv));
  end if;
  insert into tareas (tipo, referido_id) values ('aviso_no_confirmado', p_referido_id);
end;
$$;

create function rechazar_consentimiento(p_token text) returns jsonb
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

-- Panel del referente: solo sus referidos y solo lo que necesita ver (sin puntaje de IA ni datos del candidato).
-- Los mensajes que devuelven las funciones están en inglés y traen un `codigo`/`motivo`: el texto final lo pone la landing.
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

-- Cuántas cargas le quedan este mes (para mostrarlo en el formulario).
create function cupo_restante() returns int
language sql stable security definer
set search_path = public
as $$
  select greatest(cfg('tope_mensual')::int - count(*)::int, 0)
  from intentos_referido i
  join referentes rf on rf.id = i.referente_id
  where rf.auth_user_id = auth.uid() and i.created_at >= date_trunc('month', now())
$$;

-- Lo que muestra la página de inicio: montos y reglas. Solo lo público de config (no los dominios ni otros parámetros).
create function info_programa() returns jsonb
language sql stable security definer
set search_path = public
as $$
  select jsonb_build_object(
    'montos', (select jsonb_object_agg(seniority || ':' || grupo_referente, monto_usd) from montos_incentivo),
    'bono_prioritaria_usd', cfg('bono_prioritaria_usd')::numeric,
    'tope_mensual', cfg('tope_mensual')::int,
    'dias_hasta_pago', cfg('dias_hasta_pago')::int,
    'dias_consentimiento', cfg('dias_consentimiento')::int,
    'ventana_meses', cfg('ventana_meses')::int,
    'externos_habilitados', cfg('externos_habilitados')::boolean)
$$;

-- ============================================================
-- 6. Funciones de operación (recruiting/admin desde Supabase, y n8n)
-- ============================================================

-- Punto único de entrada del evento "contratado": hoy se llama a mano; mañana, desde la herramienta de selección.
create function marcar_contratado(p_referido_id uuid, p_fecha date default current_date) returns void
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

create function marcar_pagada(p_recompensa_id uuid, p_referencia text) returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_referido uuid;
begin
  perform set_config('app.actor', 'staff', true);
  update recompensas set estado = 'pagada', pagada_at = now(), referencia_pago = p_referencia
  where id = p_recompensa_id and estado = 'aprobada'
  returning referido_id into v_referido;
  if v_referido is null then
    raise exception 'La recompensa % no está aprobada', p_recompensa_id;
  end if;
  update referidos set estado = 'pagado' where id = v_referido;
end;
$$;

-- Corre una vez por día (n8n). Encola los avisos: el envío lo hace el procesador de tareas.
create function revision_diaria() returns jsonb
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

create function completar_tarea(p_id bigint, p_error text default null) returns void
language sql security definer
set search_path = public
as $$
  update tareas
  set estado = case when p_error is null then 'hecha' else 'error' end,
      error = left(p_error, 300),
      procesada_at = now()
  where id = p_id
$$;

create function guardar_puntaje(p_referido_id uuid, p_puntaje int, p_justificacion text) returns void
language sql security definer
set search_path = public
as $$
  update referidos set puntaje_ia = p_puntaje, justificacion_ia = p_justificacion where id = p_referido_id
$$;

-- ============================================================
-- 7. Seguridad: RLS y permisos
-- ============================================================
-- Regla general: la clave pública no lee ni escribe tablas sensibles. Todo pasa por las funciones de arriba,
-- que validan y devuelven solo lo necesario. n8n usa la clave secreta (service_role).

alter table config enable row level security;
alter table staff_recruiting enable row level security;
alter table referentes enable row level security;
alter table busquedas enable row level security;
alter table montos_incentivo enable row level security;
alter table candidatos enable row level security;
alter table referidos enable row level security;
alter table intentos_referido enable row level security;
alter table eventos_referido enable row level security;
alter table recompensas enable row level security;
alter table tareas enable row level security;
alter table errores enable row level security;

-- Públicas: la landing muestra las búsquedas abiertas y la tabla de montos.
create policy "busquedas abiertas visibles" on busquedas for select to anon, authenticated using (estado = 'abierta');
create policy "montos visibles" on montos_incentivo for select to anon, authenticated using (true);
-- Cada referente ve solo su perfil y sus recompensas.
create policy "ver mi perfil" on referentes for select to authenticated using (auth_user_id = auth.uid());
create policy "ver mis recompensas" on recompensas for select to authenticated
  using (referente_id in (select id from referentes where auth_user_id = auth.uid()));
-- config, staff_recruiting, candidatos, referidos, intentos_referido, eventos_referido, tareas y errores: sin policies.

-- Las funciones nuevas se pueden ejecutar por defecto desde cualquier rol: se cierra todo y se abre lo necesario.
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function crear_referido(uuid, text, text, text, text, text, text) to authenticated;
grant execute on function mis_referidos() to authenticated;
grant execute on function cupo_restante() to authenticated;
grant execute on function datos_consentimiento(text) to anon, authenticated;
grant execute on function info_programa() to anon, authenticated;
grant execute on function confirmar_consentimiento(text) to anon, authenticated;
grant execute on function rechazar_consentimiento(text) to anon, authenticated;
grant execute on all functions in schema public to service_role;
