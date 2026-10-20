# 4u4me

Wishlist compartida para Android (y para iPhone como web app) entre dos personas, **Alberto** y **Alba**. Hecha con **React + Vite**, empaquetada con **Capacitor** y con los datos en **Supabase**.

Cada uno apunta lo que quiere o necesita con una prioridad, ve la lista del otro y puede reservar en secreto lo que piensa regalarle.

## Funciones

- Dos pestañas, **Alberto** y **Alba**. Se cambia tocando o deslizando; al abrir se muestra la tuya.
- **Tu lista**: añadir con el botón **Añadir**, marcar como comprado con el círculo (el aviso permite **deshacer**) y tocar un deseo para editarlo o borrarlo. Cada deseo tiene **nombre** y **prioridad** (Muy necesario, Necesario o Capricho) y, opcionalmente, **precio**, **enlace** y **nota**. Un deseo nuevo empieza con la prioridad del último que añadiste, y si pegas un enlace en el nombre va directo al campo **Enlace**. Lo pendiente se agrupa por prioridad, con el total en euros de cada grupo y de toda la lista; lo comprado queda plegado al final.
- **La lista de la otra persona**: solo lectura, con un botón **«Lo regalo yo»** en cada deseo para reservarlo. Si lo reservas, aparece «Lo regalas tú» y puedes anularlo (reservar y anular también se pueden **deshacer** desde el aviso); arriba se ve cuántas cosas le regalas y cuánto suman.
- **Las reservas son secretas**: el dueño de una lista nunca ve qué tiene reservado. Lo garantiza la base de datos (ver más abajo), no solo la interfaz.
- Los cambios aparecen **en tiempo real** en el otro móvil.
- **Sin conexión** se ve la última copia guardada. Para cambiar algo hace falta internet; si un cambio no se guarda, la app avisa.
- El botón o gesto **Atrás** cierra la hoja de edición o el menú en vez de salir de la app.
- La primera vez se elige quién eres y se escribe el PIN; después se recuerda. En el menú **⋯** se puede cerrar sesión o cambiar de usuario.

## Cómo se protegen las reservas

Las reservas están en su propia tabla y las políticas RLS de Supabase (`supabase/schema.sql`) hacen que:

- Solo pueda leerlas y crearlas quien **no** es el dueño del deseo. Para el dueño, la tabla parece vacía; ni siquiera intentar reservar su propio deseo le da un error distinto según esté reservado o no.
- Solo quien reservó pueda anular su reserva, y nadie pueda pasar un deseo a la otra persona para luego leer sus reservas.
- Solo las dos cuentas de 4u4me sean miembros: cualquier otra cuenta (por ejemplo, una creada para espiar) no ve nada.
- Realtime aplica las mismas políticas.

`supabase/pruebas_rls.sql` comprueba todo esto haciéndose pasar por cada usuario, igual que la API con su sesión.

Lo único que RLS no puede impedir es el acceso de quien administra el proyecto de Supabase: desde el panel (Table Editor) se ven todas las tablas.

## Requisitos

- Node.js 20 o superior
- Una cuenta en [supabase.com](https://supabase.com) (el plan gratuito basta)
- Android Studio (solo para generar la app Android)
- Una cuenta de Google con un proyecto de [Firebase](https://console.firebase.google.com) (solo para publicar la versión web)

## Configurar Supabase (una sola vez)

1. **Crear el proyecto.** En supabase.com, *New project*: nombre `4u4me`, una contraseña de base de datos (guárdala en tu gestor de contraseñas; la app no la usa) y la región más cercana (por ejemplo, *West EU (Ireland)*). Espera a que termine de crearse.
2. **Cerrar el registro.** *Authentication → Sign In / Providers*: desactiva **Allow new users to sign up** y guarda. Así nadie más puede crear cuentas.
3. **Crear las tablas.** *SQL Editor → New query*: pega el contenido de `supabase/schema.sql` y pulsa **Run**. Debe terminar sin errores.
4. **Crear las dos cuentas.** *Authentication → Users → Add user → Create new user*, una vez por persona:
   - Email `alberto@antojo.local`, contraseña = PIN de Alberto.
   - Email `alba@antojo.local`, contraseña = PIN de Alba.

   El PIN debe tener **al menos 6 dígitos** (mínimo de Supabase). Marca **Auto Confirm User**. Los emails no tienen que existir, pero deben ser exactamente estos (están en `src/personas.js` y en `supabase/schema.sql`).
5. **Comprobar la seguridad.** *SQL Editor → New query*: pega `supabase/pruebas_rls.sql` y pulsa **Run**. El resultado debe ser `OK: todas las pruebas de RLS han pasado`. No deja ningún dato.
6. **Rellenar el `.env`.** Copia `.env.example` como `.env` y pon:
   - `VITE_SUPABASE_URL`: la *Project URL* (*Project Settings → Data API*, o el botón **Connect** de arriba).
   - `VITE_SUPABASE_ANON_KEY`: la clave pública del proyecto (*Project Settings → API Keys*): la **Publishable key** (`sb_publishable_…`) o, si tu panel la muestra, la **anon public**. Nunca la *secret* ni la *service_role*.

## Probar en el navegador

```bash
npm install
npm run dev
```

Para probar a la vez como las dos personas, abre `http://localhost:5173` en una ventana normal y en otra de incógnito: cada una guarda su propia sesión. También sirve abrir una en `http://localhost:5173` y otra en `http://[::1]:5173` (son orígenes distintos).

## Generar la app Android

La URL y la clave del `.env` se incluyen al compilar, así que hay que tener el `.env` relleno antes.

```bash
npm run android   # build + sync + abre Android Studio
```

Para actualizar la app ya instalada basta con repetir esto y pulsar ▶ en Android Studio: se instala encima sin perder la sesión. Al publicar una versión nueva, sube `versionCode` y `versionName` en `android/app/build.gradle`.

En Android Studio pulsa ▶ con el móvil conectado (depuración USB activada) o genera el APK desde *Build → Build APK(s)*.

Si el móvil tenía deseos de la versión anterior (solo local), se suben automáticamente a la lista de Alberto la primera vez que entra, y se borra la copia local.

## Publicar la versión web (para iPhone)

La versión web es la misma app servida desde **Firebase Hosting** (los datos siguen en Supabase). En el iPhone se abre en Safari y se instala con **Compartir → Añadir a pantalla de inicio**: se abre a pantalla completa, con su icono, y recuerda la sesión.

La primera vez:

```bash
npx firebase-tools login
npx firebase-tools use --add   # elige el proyecto de Firebase (se guarda en .firebaserc, que no se sube)
```

Y para publicar (también cada vez que cambie la app):

```bash
npm run web       # build + firebase deploy (hosting)
```

Igual que en Android, la URL y la clave pública de Supabase van dentro del código publicado. Es lo previsto: la clave anon es pública y los datos los protegen las políticas RLS y el PIN.

## Estructura

```
src/
  main.jsx            punto de entrada
  App.jsx             elige pantalla: configuración, entrada o principal
  App.css             estilos
  supabase.js         cliente de Supabase, sesión e identidad
  datos.js            deseos, reservas, tiempo real, copia sin conexión y migración
  personas.js         Alberto y Alba (nombre y email de su cuenta)
  modelo.js           prioridades, orden y formato de precios
  atras.js            que «Atrás» cierre la hoja o el menú
  components/
    Login.jsx         pantalla «¿Quién eres?»
    Principal.jsx     pestañas, datos y acciones
    Lista.jsx         lista de una persona agrupada por prioridad, con totales
    Deseo.jsx         tarjeta de un deseo (editable o con reserva)
    FormDeseo.jsx     hoja para crear, editar o borrar un deseo
    Icono.jsx         iconos SVG propios (sin librería)
    Logo.jsx          logotipo de 4u4me
public/               manifest e iconos de la versión web
supabase/
  schema.sql          tablas, políticas RLS y Realtime
  pruebas_rls.sql     pruebas de las políticas
capacitor.config.json
firebase.json         Firebase Hosting (versión web)
vite.config.js
```

## Notas

- La carpeta `android/` se sube al repo (así lo recomienda Capacitor); sus builds y las claves de firma (`*.keystore`, `*.jks`) están en `.gitignore`, igual que el `.env`.
- El identificador de la app es `com.alberto.antojo` (en `capacitor.config.json`). Conserva el nombre anterior de la app, Antojo, igual que los emails de las cuentas (`@antojo.local`) y las claves que guarda en el móvil: cambiarlos rompería las instalaciones y las cuentas existentes.
- En el plan gratuito, Supabase pausa los proyectos tras una semana sin uso. Si pasa, se reactiva desde el panel.

## Licencia

4u4me es software libre: puedes redistribuirlo y modificarlo según los términos de la [GNU General Public License](LICENSE), versión 3 o (a tu elección) cualquier versión posterior. Se distribuye sin ninguna garantía.
