-- Chequeo de salud: verifica que la base está como tiene que estar. Solo lee, no cambia nada.
-- Correr en el SQL Editor cuando quieras. Todas las filas tienen que dar ok = true.

with funciones_esperadas(nombre) as (values
  ('cfg'), ('norm_email'), ('norm_linkedin'), ('norm_telefono'), ('grupo_referente'), ('monto_para'),
  ('actor_actual'), ('handle_new_user'), ('referidos_antes_de_cambio'), ('referidos_despues_de_cambio'),
  ('crear_referido'), ('datos_consentimiento'), ('confirmar_consentimiento'), ('cerrar_no_confirmado'),
  ('rechazar_consentimiento'), ('mis_referidos'), ('cupo_restante'), ('info_programa'), ('marcar_contratado'), ('marcar_pagada'),
  ('revision_diaria'), ('tomar_tareas'), ('completar_tarea'), ('guardar_puntaje')
),
chequeos(orden, area, chequeo, esperado, obtenido) as (
  -- Estructura
  select 1, 'Estructura', 'Tablas del programa (11 + errores)', '12',
    (select count(*)::text from pg_tables where schemaname = 'public')
  union all select 2, 'Estructura', 'Funciones que faltan', '(ninguna)',
    coalesce((select string_agg(nombre, ', ') from funciones_esperadas f
              where not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                                where n.nspname = 'public' and p.proname = f.nombre)), '(ninguna)')
  union all select 3, 'Estructura', 'Triggers (alta de referente + 2 de historial/recompensa)', '3',
    (select count(*)::text from pg_trigger
     where tgname in ('on_auth_user_confirmado', 'referidos_antes_de_cambio', 'referidos_despues_de_cambio'))
  -- Seguridad
  union all select 4, 'Seguridad', 'Tablas SIN RLS activado', '0',
    (select count(*)::text from pg_tables where schemaname = 'public' and not rowsecurity)
  union all select 5, 'Seguridad', 'Policies en tablas del programa', '4',
    (select count(*)::text from pg_policies where schemaname = 'public')
  union all select 6, 'Seguridad', 'Un visitante (anon) puede crear referidos', 'false',
    has_function_privilege('anon', 'public.crear_referido(uuid,text,text,text,text,text,text)', 'execute')::text
  union all select 7, 'Seguridad', 'Un usuario logueado puede crear referidos', 'true',
    has_function_privilege('authenticated', 'public.crear_referido(uuid,text,text,text,text,text,text)', 'execute')::text
  union all select 8, 'Seguridad', 'Un usuario logueado puede tomar la cola de n8n', 'false',
    has_function_privilege('authenticated', 'public.tomar_tareas(integer)', 'execute')::text
  union all select 9, 'Seguridad', 'n8n (service_role) puede tomar la cola', 'true',
    has_function_privilege('service_role', 'public.tomar_tareas(integer)', 'execute')::text
  -- Storage
  union all select 10, 'Storage', 'Bucket cvs existe y es privado', 'privado',
    coalesce((select case when public then 'PÚBLICO' else 'privado' end from storage.buckets where id = 'cvs'), 'no existe')
  union all select 11, 'Storage', 'Policies del bucket (subir, ver, borrar)', '3',
    (select count(*)::text from pg_policies where schemaname = 'storage' and tablename = 'objects'
     and policyname like '%CV%carpeta%')
  -- Datos iniciales
  union all select 12, 'Datos', 'Parámetros en config', '7', (select count(*)::text from config)
  union all select 13, 'Datos', 'Búsquedas abiertas', '5', (select count(*)::text from busquedas where estado = 'abierta')
  union all select 14, 'Datos', 'Filas de montos (3 seniority × 2 grupos)', '6', (select count(*)::text from montos_incentivo)
  union all select 15, 'Datos', 'Candidatos directos de ejemplo', '3', (select count(*)::text from candidatos where origen = 'directo')
  -- Limpieza de los tests
  union all select 16, 'Limpieza', 'Usuarios de prueba que quedaron', '0',
    (select count(*)::text from auth.users where id::text like '00000000-0000-4000-8000-%')
  union all select 17, 'Limpieza', 'Candidatos de prueba que quedaron', '0',
    (select count(*)::text from candidatos where email_norm like '%@test.invalid')
)
select case when esperado = obtenido then '✅' else '❌' end as ok, area, chequeo, esperado, obtenido
from chequeos order by orden;
