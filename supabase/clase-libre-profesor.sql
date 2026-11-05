-- =============================================================================
-- Clase libre registrada por el profesor
-- =============================================================================
-- El profesor registra "1 clase libre" desde la pantalla de asistencia de su clase,
-- sin escribir ni ver montos. El monto lo pone esta función, no la app.
--
-- Qué hace: inserta una fila en public.ingresos_extra con
--     concepto    = 'CLASE LIBRE'
--     monto       = precio fijo (v_precio, más abajo)
--     fecha       = hoy (hora de Lima)
--     metodo_pago = el que elige el profesor (Efectivo, Yape, Plin o Transferencia)
--     notas       = nombre del horario de la clase
-- En el panel de admin aparece en Ingresos Extra y el Dashboard lo suma solo.
--
-- Seguridad: el profesor NO recibe permisos sobre ingresos_extra. Solo puede
-- llamar a esta función, que valida el rol y fija el monto. No puede leer,
-- editar ni borrar ingresos.
--
-- CAMBIAR EL PRECIO: edita el número de v_precio y vuelve a ejecutar todo el
-- archivo (create or replace). Los registros anteriores no cambian.
--
-- Cómo aplicar: Supabase > SQL Editor > pegar todo > Run.
-- Ejecutarlo ANTES de usar el botón en la app (si no, el botón dará error).
-- =============================================================================

create or replace function public.registrar_clase_libre(
  p_horario_id uuid,
  p_metodo_pago text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_precio constant numeric := 20;  -- <<< PRECIO FIJO DE UNA CLASE LIBRE (S/)
  v_horario text;
begin
  if coalesce(public.get_auth_role(), '') <> 'profesor' then
    raise exception 'No autorizado';
  end if;

  if p_metodo_pago is null
     or p_metodo_pago not in ('Efectivo', 'Yape', 'Plin', 'Transferencia') then
    raise exception 'Método de pago inválido';
  end if;

  select nombre into v_horario from public.horarios where id = p_horario_id;
  if not found then
    raise exception 'Horario no encontrado';
  end if;

  insert into public.ingresos_extra (concepto, monto, fecha, metodo_pago, notas)
  values (
    'CLASE LIBRE',
    v_precio,
    (now() at time zone 'America/Lima')::date,
    p_metodo_pago,
    v_horario
  );
end;
$$;

-- Solo usuarios con sesión pueden llamarla (la función igual exige rol 'profesor').
revoke all on function public.registrar_clase_libre(uuid, text) from public;
revoke all on function public.registrar_clase_libre(uuid, text) from anon;
grant execute on function public.registrar_clase_libre(uuid, text) to authenticated;

-- =============================================================================
-- PRUEBA: entrar con la cuenta de profesor, abrir una clase, "Registrar clase
-- libre", elegir método y confirmar. Luego, en el panel de admin > Ingresos
-- Extra, debe aparecer "CLASE LIBRE" con el monto y el horario en notas.
--
-- DESHACER (quitar la función):
--   drop function if exists public.registrar_clase_libre(uuid, text);
-- =============================================================================
