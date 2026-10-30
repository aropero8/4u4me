-- Nivel de ganas de los caprichos (1 a 3 corazones).
--
-- Solo hace falta en una base creada antes de este cambio: schema.sql ya
-- incluye la columna. Se ejecuta una vez en el SQL Editor; repetirlo no
-- hace nada.

alter table public.deseos
  add column if not exists ganas smallint not null default 2
    check (ganas between 1 and 3); -- solo cuenta en los caprichos
