# CLAUDE.md

Contexto del proyecto para Claude Code.

## Qué es

**4u4me**: app de wishlist para Android compartida entre dos personas, **Alberto** y **Alba**. Cada uno apunta cosas que quiere o necesita con una prioridad, ve la lista del otro y puede reservar en secreto lo que le va a regalar. Uso personal, pero el repo es público en GitHub (licencia GPL-3.0 o posterior): debe quedar limpio y comprensible, y sin secretos.

**Nombre**: la app se llamaba **Antojo**. Lo visible (título, `appName`, `app_name` de Android, README, repo `aropero8/4u4me`) es ahora **4u4me**, pero los identificadores internos conservan "antojo" **a propósito y no deben renombrarse**: el `appId` `com.alberto.antojo` (cambiarlo hace que Android la trate como otra app y se pierde la migración de `wishlist_items`), los emails `@antojo.local` (son las cuentas de Supabase Auth y están en `schema.sql`), las claves de Preferences `antojo_*` (se perderían la sesión y la copia) y el prefijo del canal de Realtime.

## Stack

- React 19 + Vite 7, JavaScript (JSX), **sin TypeScript**.
- Capacitor 7 para empaquetar en Android (`@capacitor/android`, `@capacitor/core`, `@capacitor/cli`).
- Datos en **Supabase** (`@supabase/supabase-js`): Postgres con RLS, Auth y Realtime.
- `@capacitor/preferences` (nativo en Android, localStorage en navegador) para la sesión, la identidad y la copia sin conexión.
- CSS plano en `src/App.css`, sin frameworks de estilos.
- `appId`: `com.alberto.antojo` · `webDir`: `dist`.
- `vite.config.js` usa `base: './'`: es obligatorio para que Capacitor cargue los assets. No quitarlo.
- Configuración en `.env` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`; ver `.env.example`). Vite la mete en el bundle al compilar.

## Estructura

```
src/
  main.jsx            punto de entrada
  App.jsx             elige pantalla: falta configuración / Login / Principal
  App.css             estilos (tema oscuro, variables CSS en :root)
  supabase.js         cliente, inicio/cierre de sesión, identidad guardada
  datos.js            CRUD de deseos y reservas, Realtime, copia local, migración
  personas.js         PERSONAS: id, nombre y email de cada cuenta
  modelo.js           PRIORIDADES, orden, formato y lectura de precios
  components/
    Login.jsx         "¿Quién eres?" + PIN
    Principal.jsx     estado de datos, pestañas (scroll-snap), acciones, avisos
    Lista.jsx         lista de una persona: grupos por prioridad, totales, comprados plegados
    Deseo.jsx         tarjeta: editable (propia) o con reserva (ajena)
    FormDeseo.jsx     hoja inferior de alta/edición/borrado
    Icono.jsx         iconos SVG de trazo hechos a mano (sin librería)
    Logo.jsx          logotipo (regalo sobre el degradado de la marca)
supabase/
  schema.sql          tablas, trigger de perfiles, permisos, RLS y Realtime
  pruebas_rls.sql     pruebas de RLS para el SQL Editor (todo en una transacción con rollback)
```

El acceso a datos está solo en `src/` (`supabase.js`, `datos.js`); los componentes no llaman a Supabase directamente.

## Modelo de datos (Supabase)

- `perfiles (id = auth.users.id, nombre)`: los dos miembros. Los crea un trigger al crear la cuenta en Auth, **solo** si el email está en `privado.nombre_de_miembro()`.
- `deseos (id, propietario, nombre, prioridad, precio, enlace, nota, comprado, creado)`: `propietario` por defecto `auth.uid()`; `prioridad` en `'muy' | 'necesario' | 'capricho'`; `precio` numeric o null.
- `reservas (id, deseo_id único, reservado_por, fecha)`: la PK es un uuid aleatorio a propósito (los DELETE de Realtime envían la PK a todos sin aplicar RLS; así no revelan el deseo).

En la app (`datos.js`) un deseo usa `precio: ''` para "sin precio" y `creado` en milisegundos, como en la versión anterior.

**Garantía principal**: el dueño de un deseo nunca puede leer ni deducir sus reservas. Lo imponen las políticas RLS; la interfaz además no le pasa reservas a la lista propia. Cualquier cambio en `schema.sql` debe mantener `pruebas_rls.sql` en verde; si se cambia el esquema, actualizar también las pruebas.

Los emails de las cuentas están en dos sitios que deben coincidir: `src/personas.js` y `privado.nombre_de_miembro()` en `schema.sql`.

## Funcionalidad actual

- Pestañas Alberto / Alba como control segmentado (tocar o deslizar, con scroll-snap; el indicador sigue al carril con `--progreso`); se abre en la propia.
- Lista propia: alta (botón "Añadir"), marcar comprado con el círculo (aviso con "Deshacer"), tocar la tarjeta para editar; borrar está en la hoja de edición con confirmación dentro de la propia hoja (sin `confirm()` nativo). Pendientes agrupados por prioridad con contador y subtotal; total en € arriba; "Comprados" plegado al final. Dentro de cada grupo, el más reciente primero.
- Lista ajena: solo lectura; "Lo regalo yo" reserva; "Lo regalas tú" + "Anular"; resumen "Le regalas N cosas · X €" arriba.
- Hoja de edición: tocar fuera solo cierra si no hay cambios; Escape cierra.
- Estilo: tema oscuro; colores en variables de `:root` en `App.css` (marca lila → rosa en `--degradado`, prioridades `--muy`/`--necesario`/`--capricho`, reservas `--regalo`). `capacitor.config.json` pone el mismo fondo (`backgroundColor`) para que no haya destello blanco al abrir.
- Realtime: ante cualquier cambio en `deseos` o `reservas` se recarga todo (los datos son pocos).
- Sin conexión: se muestra la copia guardada (`antojo_copia`, ligada al uid). Los cambios no se encolan: se avisa si fallan y el formulario no se cierra.
- Identidad (`antojo_identidad`) guardada aparte de la sesión de Supabase para poder abrir sin conexión aunque el token haya caducado.
- Migración: si existe la clave local antigua `wishlist_items`, al entrar como Alberto se sube a su lista (upsert por id, idempotente) y se borra.
- Respeta `safe-area-inset` (notch y barra de gestos).

## Comandos

```bash
npm install
npm run dev          # navegador (dos personas a la vez: localhost:5173 y [::1]:5173, o una ventana de incógnito)
npm run build
npm run android      # build + cap sync + abre Android Studio
```

## Estado

- La app y el esquema están hechos. Las políticas RLS se han probado con PGlite (Postgres en WASM) imitando Supabase, incluidas pruebas de mutación (debilitar cada política hace fallar `pruebas_rls.sql`).
- La interfaz se ha probado en el navegador sin servidor (modo sin conexión, pestañas, solo lectura, avisos, cierre de sesión). Falta la prueba de extremo a extremo con el proyecto real de Supabase.
- Repo en GitHub (público, GPL-3.0 o posterior, ver `LICENSE`): `aropero8/4u4me`, rama `main`.

## Convenciones

- UI, textos, nombres de variables y commits en **español**.
- Mantener dependencias al mínimo; preguntar antes de añadir librerías.
- Componentes en `src/components/`; acceso a datos en `src/`.
- Git: la carpeta `android/` se sube; builds, `node_modules/`, `dist/`, `.env` y claves de firma (`*.keystore`, `*.jks`) están en `.gitignore`. Nunca subir claves de firma ni el `.env`: el repo es público, así que tampoco URLs ni claves del proyecto de Supabase, PINs ni datos personales.
- Mantener el README al día cuando cambie la funcionalidad, los comandos o la configuración.

## Ideas pendientes (no hechas)

- Foto del producto con `@capacitor/camera` (y Supabase Storage).
- Editar sin conexión con cola de cambios.
- Icono y splash propios (`@capacitor/assets`), a partir de `Logo.jsx`.
- Que el botón Atrás de Android cierre la hoja o el menú en vez de salir (`@capacitor/app`).
- Vibración al marcar comprado o reservar (`@capacitor/haptics`).
