-- Migración 001 (20/10): función pública con montos y reglas para la página de inicio.
-- Para bases creadas antes de este cambio. Una base nueva ya la trae en schema.sql.

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

revoke execute on function info_programa() from public;
grant execute on function info_programa() to anon, authenticated, service_role;
