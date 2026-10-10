-- =============================================================================
-- Restringe lo que el rol 'profesor' puede hacer sobre public.asistencias
-- =============================================================================
-- ANTES : una política ALL ("Profesor puede gestionar asistencias") que permitía
--         leer, insertar, editar y BORRAR cualquier asistencia de cualquier fecha.
-- AHORA : - Leer todas las asistencias (la app necesita ver también las "Congelado").
--         - Insertar solo "Presente" de HOY (el bloqueo de congelados sigue siendo
--           solo de la app: ver nota dentro de la política de INSERT).
--         - Borrar solo "Presente" de HOY (la acción de desmarcar en la tablet).
--         - Sin UPDATE.
--
-- Las políticas de admin NO se tocan.
-- Cómo aplicar: Supabase > SQL Editor > pegar todo > Run.
-- Todo va en una transacción: si algo falla, no se aplica nada.
-- Zona horaria: 'America/Lima' (sin horario de verano).
-- =============================================================================

begin;

drop policy if exists "Profesor puede gestionar asistencias" on public.asistencias;
drop policy if exists "Profesor puede ver asistencias" on public.asistencias;
drop policy if exists "Profesor puede registrar asistencia de hoy" on public.asistencias;
drop policy if exists "Profesor puede anular asistencia de hoy" on public.asistencias;

create policy "Profesor puede ver asistencias"
on public.asistencias
for select
to authenticated
using (
  (select get_auth_role()) = 'profesor'
);

create policy "Profesor puede registrar asistencia de hoy"
on public.asistencias
for insert
to authenticated
with check (
  (select get_auth_role()) = 'profesor'
  and estado = 'Presente'
  and (fecha_asistencia at time zone 'America/Lima')::date
      = (now() at time zone 'America/Lima')::date
  -- OJO: no consultar public.asistencias dentro de esta política (p. ej. con
  -- NOT EXISTS para detectar "Congelado"). Postgres lo rechaza con
  -- "infinite recursion detected in policy for relation asistencias" y deja a
  -- admin y profesor sin poder insertar. El bloqueo de congelados es solo en la app.
);

create policy "Profesor puede anular asistencia de hoy"
on public.asistencias
for delete
to authenticated
using (
  (select get_auth_role()) = 'profesor'
  and coalesce(estado, 'Presente') = 'Presente'
  and (fecha_asistencia at time zone 'America/Lima')::date
      = (now() at time zone 'America/Lima')::date
);

commit;

-- =============================================================================
-- PRUEBA (entrando con la cuenta de profesor, en la tablet o en el navegador):
--   1. Abrir una clase de hoy, marcar a un alumno y desmarcarlo: debe funcionar.
--   2. Un alumno congelado hoy sigue bloqueado en pantalla.
--   3. El panel de admin debe seguir funcionando igual (asistencia de cualquier día).
--
-- ROLLBACK (volver a como estaba, si algo no funciona como se espera):
--
--   begin;
--   drop policy if exists "Profesor puede ver asistencias" on public.asistencias;
--   drop policy if exists "Profesor puede registrar asistencia de hoy" on public.asistencias;
--   drop policy if exists "Profesor puede anular asistencia de hoy" on public.asistencias;
--   create policy "Profesor puede gestionar asistencias"
--   on public.asistencias for all to authenticated
--   using ((get_auth_role() = 'profesor'::text))
--   with check ((get_auth_role() = 'profesor'::text));
--   commit;
-- =============================================================================
