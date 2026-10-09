-- =====================================================================
-- 4u4me · pruebas de las políticas RLS
--
-- Ejecutar en el SQL Editor DESPUÉS de schema.sql y de crear las dos
-- cuentas en Auth. Hace de Alberto, de Alba, de una cuenta ajena y de
-- un visitante sin sesión, igual que haría la API con sus sesiones.
--
-- Todo va dentro de una transacción que se deshace al final: no deja
-- ningún dato. Si algo falla, se para con un error "FALLO: ...". Si
-- todo va bien, el resultado es una fila con "OK".
-- =====================================================================

begin;

-- Ids de las cuentas (se leen como administrador, antes de cambiar de rol).
select set_config('pruebas.alberto',
  (select id::text from auth.users where lower(email) = 'alberto@antojo.local'), true);
select set_config('pruebas.alba',
  (select id::text from auth.users where lower(email) = 'alba@antojo.local'), true);

do $$
begin
  if coalesce(current_setting('pruebas.alberto', true), '') = ''
     or coalesce(current_setting('pruebas.alba', true), '') = '' then
    raise exception 'FALLO: faltan las cuentas alberto@antojo.local y/o alba@antojo.local en Auth';
  end if;
  if (select count(*) from public.perfiles) <> 2 then
    raise exception 'FALLO: debería haber exactamente 2 perfiles y hay %',
      (select count(*) from public.perfiles);
  end if;
end $$;

-- Cuenta ajena: existe en Auth pero no es miembro (se borra al final).
insert into auth.users (id, email)
values ('00000000-0000-4000-8000-0000000000ff', 'intruso@example.com');
select set_config('pruebas.intruso', '00000000-0000-4000-8000-0000000000ff', true);

do $$
begin
  if exists (select 1 from public.perfiles
             where id = '00000000-0000-4000-8000-0000000000ff') then
    raise exception 'FALLO: una cuenta ajena ha recibido perfil';
  end if;
end $$;


-- ---------------------------------------------------------------------
-- Como ALBERTO
-- ---------------------------------------------------------------------
reset role;
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('pruebas.alberto'), 'role', 'authenticated')::text, true);
set local role authenticated;

-- Dos deseos suyos (el propietario lo pone la base de datos).
insert into public.deseos (id, nombre, prioridad)
values ('aaaaaaaa-0000-4000-8000-000000000001', 'Deseo 1 de Alberto', 'muy'),
       ('aaaaaaaa-0000-4000-8000-000000000002', 'Deseo 2 de Alberto', 'capricho');

do $$
begin
  if (select propietario from public.deseos
      where id = 'aaaaaaaa-0000-4000-8000-000000000001')::text
     <> current_setting('pruebas.alberto') then
    raise exception 'FALLO: el propietario por defecto no es quien crea el deseo';
  end if;

  -- No puede crear deseos a nombre de Alba.
  begin
    insert into public.deseos (nombre, propietario)
    values ('Colado', current_setting('pruebas.alba')::uuid);
    raise exception 'FALLO: Alberto ha creado un deseo a nombre de Alba';
  exception when insufficient_privilege then null;
  end;
end $$;


-- ---------------------------------------------------------------------
-- Como ALBA
-- ---------------------------------------------------------------------
reset role;
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('pruebas.alba'), 'role', 'authenticated')::text, true);
set local role authenticated;

insert into public.deseos (id, nombre)
values ('bbbbbbbb-0000-4000-8000-000000000001', 'Deseo de Alba');

do $$
declare
  n int;
begin
  -- Ve los deseos de los dos.
  select count(*) into n from public.deseos
  where id in ('aaaaaaaa-0000-4000-8000-000000000001',
               'aaaaaaaa-0000-4000-8000-000000000002',
               'bbbbbbbb-0000-4000-8000-000000000001');
  if n <> 3 then
    raise exception 'FALLO: Alba ve % de los 3 deseos', n;
  end if;

  -- Ve los dos perfiles.
  if (select count(*) from public.perfiles) <> 2 then
    raise exception 'FALLO: Alba no ve los 2 perfiles';
  end if;

  -- No puede editar ni borrar los de Alberto (RLS los filtra: 0 filas).
  with u as (
    update public.deseos set nombre = 'Cambiado', comprado = true
    where id = 'aaaaaaaa-0000-4000-8000-000000000001' returning 1
  ) select count(*) into n from u;
  if n <> 0 then
    raise exception 'FALLO: Alba ha editado un deseo de Alberto';
  end if;

  with d as (
    delete from public.deseos
    where id = 'aaaaaaaa-0000-4000-8000-000000000001' returning 1
  ) select count(*) into n from d;
  if n <> 0 then
    raise exception 'FALLO: Alba ha borrado un deseo de Alberto';
  end if;

  -- Reserva un deseo de Alberto.
  insert into public.reservas (deseo_id)
  values ('aaaaaaaa-0000-4000-8000-000000000001');

  if (select reservado_por from public.reservas
      where deseo_id = 'aaaaaaaa-0000-4000-8000-000000000001')::text
     <> current_setting('pruebas.alba') then
    raise exception 'FALLO: Alba no ve su reserva o no consta como suya';
  end if;

  -- No puede reservar un deseo suyo.
  begin
    insert into public.reservas (deseo_id)
    values ('bbbbbbbb-0000-4000-8000-000000000001');
    raise exception 'FALLO: Alba ha reservado un deseo suyo';
  exception when insufficient_privilege then null;
  end;

  -- No puede reservar a nombre de Alberto.
  begin
    insert into public.reservas (deseo_id, reservado_por)
    values ('aaaaaaaa-0000-4000-8000-000000000002',
            current_setting('pruebas.alberto')::uuid);
    raise exception 'FALLO: Alba ha creado una reserva a nombre de Alberto';
  exception when insufficient_privilege then null;
  end;
end $$;


-- ---------------------------------------------------------------------
-- Como ALBERTO: no debe ver NADA de la reserva de Alba
-- ---------------------------------------------------------------------
reset role;
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('pruebas.alberto'), 'role', 'authenticated')::text, true);
set local role authenticated;

do $$
declare
  n int;
begin
  -- La tabla le parece vacía, se consulte como se consulte.
  if (select count(*) from public.reservas) <> 0 then
    raise exception 'FALLO: Alberto ve reservas de su lista';
  end if;
  if exists (select 1 from public.reservas
             where deseo_id = 'aaaaaaaa-0000-4000-8000-000000000001') then
    raise exception 'FALLO: Alberto ve la reserva de su deseo';
  end if;
  if exists (select 1 from public.deseos d
             join public.reservas r on r.deseo_id = d.id) then
    raise exception 'FALLO: Alberto ve reservas mediante un join';
  end if;

  -- Intentar reservar su propio deseo da el MISMO error esté o no
  -- reservado (si diera "duplicado", delataría la reserva).
  begin
    insert into public.reservas (deseo_id)
    values ('aaaaaaaa-0000-4000-8000-000000000001');
    raise exception 'FALLO: Alberto ha reservado un deseo suyo';
  exception
    when insufficient_privilege then null;
    when unique_violation then
      raise exception 'FALLO: el error de duplicado delata que el deseo está reservado';
  end;

  -- No puede borrar ni modificar la reserva de Alba.
  with d as (
    delete from public.reservas returning 1
  ) select count(*) into n from d;
  if n <> 0 then
    raise exception 'FALLO: Alberto ha borrado reservas de su lista';
  end if;

  begin
    update public.reservas set reservado_por = current_setting('pruebas.alberto')::uuid;
    raise exception 'FALLO: Alberto ha podido modificar reservas';
  exception when insufficient_privilege then null;
  end;

  -- No puede pasarle su deseo a Alba para luego leer la reserva.
  begin
    update public.deseos
    set propietario = current_setting('pruebas.alba')::uuid
    where id = 'aaaaaaaa-0000-4000-8000-000000000001';
    raise exception 'FALLO: Alberto ha cambiado el propietario de un deseo';
  exception when insufficient_privilege then null;
  end;

  -- Sí puede editar sus deseos y reservar los de Alba.
  with u as (
    update public.deseos set comprado = true
    where id = 'aaaaaaaa-0000-4000-8000-000000000002' returning 1
  ) select count(*) into n from u;
  if n <> 1 then
    raise exception 'FALLO: Alberto no puede editar su propio deseo';
  end if;

  insert into public.reservas (deseo_id)
  values ('bbbbbbbb-0000-4000-8000-000000000001');
  if (select count(*) from public.reservas) <> 1 then
    raise exception 'FALLO: Alberto no ve su reserva en la lista de Alba';
  end if;
end $$;


-- ---------------------------------------------------------------------
-- Como ALBA: su reserva sigue ahí; la anula; no ve la de Alberto
-- ---------------------------------------------------------------------
reset role;
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('pruebas.alba'), 'role', 'authenticated')::text, true);
set local role authenticated;

do $$
declare
  n int;
begin
  if (select count(*) from public.reservas) <> 1 then
    raise exception 'FALLO: Alba no ve exactamente su reserva (ve %)',
      (select count(*) from public.reservas);
  end if;

  with d as (
    delete from public.reservas
    where deseo_id = 'aaaaaaaa-0000-4000-8000-000000000001' returning 1
  ) select count(*) into n from d;
  if n <> 1 then
    raise exception 'FALLO: Alba no puede anular su reserva';
  end if;
end $$;


-- ---------------------------------------------------------------------
-- Como la CUENTA AJENA: no ve ni toca nada
-- ---------------------------------------------------------------------
reset role;
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('pruebas.intruso'), 'role', 'authenticated')::text, true);
set local role authenticated;

do $$
begin
  if (select count(*) from public.deseos) <> 0
     or (select count(*) from public.reservas) <> 0
     or (select count(*) from public.perfiles) <> 0 then
    raise exception 'FALLO: una cuenta ajena ve datos';
  end if;

  begin
    insert into public.deseos (nombre) values ('Intruso');
    raise exception 'FALLO: una cuenta ajena ha creado un deseo';
  exception when insufficient_privilege or foreign_key_violation then null;
  end;

  begin
    insert into public.reservas (deseo_id)
    values ('aaaaaaaa-0000-4000-8000-000000000001');
    raise exception 'FALLO: una cuenta ajena ha creado una reserva';
  exception when insufficient_privilege or foreign_key_violation then null;
  end;
end $$;


-- ---------------------------------------------------------------------
-- Sin sesión (rol anon): sin acceso
-- ---------------------------------------------------------------------
reset role;
select set_config('request.jwt.claims', '{"role": "anon"}', true);
set local role anon;

do $$
begin
  begin
    perform 1 from public.deseos;
    raise exception 'FALLO: sin sesión se pueden leer los deseos';
  exception when insufficient_privilege then null;
  end;
  begin
    perform 1 from public.reservas;
    raise exception 'FALLO: sin sesión se pueden leer las reservas';
  exception when insufficient_privilege then null;
  end;
end $$;


-- ---------------------------------------------------------------------
-- Realtime activado en deseos y reservas
-- ---------------------------------------------------------------------
reset role;

do $$
begin
  if (select count(*) from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename in ('deseos', 'reservas')) <> 2 then
    raise exception 'FALLO: Realtime no está activado en deseos y reservas';
  end if;
end $$;

rollback;

select 'OK: todas las pruebas de RLS han pasado' as resultado;
