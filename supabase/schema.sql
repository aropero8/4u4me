-- =====================================================================
-- Antojo · esquema de Supabase
--
-- Ejecutar ENTERO, una sola vez, en el SQL Editor de un proyecto vacío.
--
-- Garantía principal: el dueño de una lista NUNCA puede leer las
-- reservas de sus propios deseos. Lo impide RLS en la base de datos,
-- no la interfaz. Las pruebas están en supabase/pruebas_rls.sql.
-- =====================================================================


-- ---------------------------------------------------------------------
-- Miembros
--
-- Solo estas dos cuentas forman parte de Antojo. Deben coincidir con
-- los emails de src/personas.js. Cualquier otra cuenta que exista en
-- Auth (por ejemplo, si alguien se registra) no puede leer ni escribir
-- nada, y tampoco sirve para espiar las reservas de la propia lista.
-- ---------------------------------------------------------------------

create schema if not exists privado;

create function privado.nombre_de_miembro(email text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case lower(email)
    when 'alberto@antojo.local' then 'Alberto'
    when 'alba@antojo.local' then 'Alba'
  end;
$$;


-- ---------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------

create table public.perfiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nombre text not null
);

create table public.deseos (
  id uuid primary key default gen_random_uuid(),
  propietario uuid not null default auth.uid()
    references public.perfiles (id) on delete cascade,
  nombre text not null check (btrim(nombre) <> ''),
  prioridad text not null default 'necesario'
    check (prioridad in ('muy', 'necesario', 'capricho')),
  precio numeric(10, 2) check (precio >= 0), -- null = sin precio
  enlace text not null default '',
  nota text not null default '',
  comprado boolean not null default false,
  creado timestamptz not null default now()
);

create index deseos_propietario_idx on public.deseos (propietario);

-- Una reserva por deseo. La clave primaria es un id aleatorio y no
-- deseo_id a propósito: cuando se borra una reserva, Realtime envía la
-- clave primaria a todos los suscriptores (en los DELETE no se aplica
-- RLS), y así no revela de qué deseo era.
create table public.reservas (
  id uuid primary key default gen_random_uuid(),
  deseo_id uuid not null unique
    references public.deseos (id) on delete cascade,
  reservado_por uuid not null default auth.uid()
    references public.perfiles (id) on delete cascade,
  fecha timestamptz not null default now()
);

create index reservas_reservado_por_idx on public.reservas (reservado_por);


-- ---------------------------------------------------------------------
-- Perfiles automáticos
--
-- Al crear una cuenta en Auth se crea su perfil, solo si es uno de los
-- dos miembros. El insert final cubre las cuentas creadas antes de
-- ejecutar este script.
-- ---------------------------------------------------------------------

create function privado.crear_perfil()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_nombre text := privado.nombre_de_miembro(new.email);
begin
  if v_nombre is not null then
    insert into public.perfiles (id, nombre)
    values (new.id, v_nombre)
    on conflict (id) do nothing;
  end if;
  return new;
end;
$$;

create trigger crear_perfil_al_crear_usuario
  after insert on auth.users
  for each row execute function privado.crear_perfil();

insert into public.perfiles (id, nombre)
select id, privado.nombre_de_miembro(email)
from auth.users
where privado.nombre_de_miembro(email) is not null
on conflict (id) do nothing;


-- ---------------------------------------------------------------------
-- ¿La sesión actual es de un miembro?
--
-- security definer para poder consultar perfiles desde sus propias
-- políticas sin recursión. Está en el esquema "privado", que no se
-- expone por la API.
-- ---------------------------------------------------------------------

create function privado.es_miembro()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.perfiles where id = (select auth.uid())
  );
$$;


-- ---------------------------------------------------------------------
-- Permisos
--
-- Solo el rol "authenticated" (sesión iniciada) toca las tablas. El rol
-- "anon" (sin sesión) no tiene acceso a nada.
-- ---------------------------------------------------------------------

revoke all on function privado.nombre_de_miembro(text) from public;
revoke all on function privado.crear_perfil() from public;
revoke all on function privado.es_miembro() from public;

grant usage on schema privado to authenticated;
grant execute on function privado.es_miembro() to authenticated;

revoke all on table public.perfiles, public.deseos, public.reservas from anon, authenticated;

grant select on table public.perfiles to authenticated;
grant select, insert, update, delete on table public.deseos to authenticated;
grant select, insert, delete on table public.reservas to authenticated;


-- ---------------------------------------------------------------------
-- Políticas RLS
-- ---------------------------------------------------------------------

alter table public.perfiles enable row level security;
alter table public.deseos enable row level security;
alter table public.reservas enable row level security;

-- perfiles: los miembros ven los dos perfiles. Nadie los modifica desde
-- la app (los crea el trigger).
create policy "Los miembros ven los perfiles"
  on public.perfiles for select to authenticated
  using (privado.es_miembro());

-- deseos: los dos leen todos; cada uno solo crea, edita y borra los suyos.
create policy "Los miembros ven todos los deseos"
  on public.deseos for select to authenticated
  using (privado.es_miembro());

create policy "Cada uno crea sus deseos"
  on public.deseos for insert to authenticated
  with check (propietario = (select auth.uid()));

-- El with check impide pasarle un deseo a la otra persona (por ejemplo,
-- para poder leer luego sus reservas).
create policy "Cada uno edita sus deseos"
  on public.deseos for update to authenticated
  using (propietario = (select auth.uid()))
  with check (propietario = (select auth.uid()));

create policy "Cada uno borra sus deseos"
  on public.deseos for delete to authenticated
  using (propietario = (select auth.uid()));

-- reservas: solo las ve y las crea quien NO es el dueño del deseo.
-- El dueño no obtiene filas ni errores distintos: para él la tabla
-- parece vacía.
create policy "Las reservas solo las ve quien no es el dueño"
  on public.reservas for select to authenticated
  using (
    privado.es_miembro()
    and exists (
      select 1 from public.deseos d
      where d.id = reservas.deseo_id
        and d.propietario <> (select auth.uid())
    )
  );

create policy "Solo reserva quien no es el dueño"
  on public.reservas for insert to authenticated
  with check (
    reservado_por = (select auth.uid())
    and exists (
      select 1 from public.deseos d
      where d.id = reservas.deseo_id
        and d.propietario <> (select auth.uid())
    )
  );

create policy "Solo quien reservó anula su reserva"
  on public.reservas for delete to authenticated
  using (reservado_por = (select auth.uid()));

-- Sin política de update en reservas: no se pueden modificar, solo
-- crear y borrar.


-- ---------------------------------------------------------------------
-- Realtime
--
-- Realtime aplica estas mismas políticas: el dueño no recibe los
-- avisos de reservas nuevas en sus deseos.
-- ---------------------------------------------------------------------

alter publication supabase_realtime add table public.deseos, public.reservas;
