# CLAUDE.md

Contexto del proyecto para Claude Code.

## Qué es

**Antojo**: app personal de wishlist para Android. El usuario apunta cosas que quiere o necesita, les asigna una prioridad y las consulta desde el móvil. Uso personal, pero el repo (privado en GitHub) debe quedar limpio y comprensible por si en el futuro se comparte.

## Stack

- React 19 + Vite 7, JavaScript (JSX), **sin TypeScript**.
- Capacitor 7 para empaquetar en Android (`@capacitor/android`, `@capacitor/core`, `@capacitor/cli`).
- Persistencia: `@capacitor/preferences` (nativo en Android, localStorage en navegador). Sin backend ni cuentas.
- CSS plano en `src/App.css`, sin frameworks de estilos.
- `appId`: `com.alberto.antojo` · `webDir`: `dist`.
- `vite.config.js` usa `base: './'`: es obligatorio para que Capacitor cargue los assets. No quitarlo.

## Estructura

```
src/
  main.jsx     punto de entrada
  App.jsx      toda la UI y la lógica (lista, filtros, formulario)
  App.css      estilos (tema oscuro, variables CSS en :root)
  storage.js   loadItems() / saveItems() con Capacitor Preferences
```

## Modelo de datos

Se guarda un array JSON bajo la clave `wishlist_items`:

```js
{
  id: string,          // crypto.randomUUID()
  nombre: string,
  prioridad: 'muy' | 'necesario' | 'capricho',
  precio: number | '', // '' = sin precio
  enlace: string,      // puede venir sin https://
  nota: string,
  comprado: boolean,
  creado: number       // Date.now()
}
```

Si se cambia esta forma, añadir migración en `loadItems()` para no perder los datos ya guardados en el móvil.

## Funcionalidad actual

- Prioridades: Muy necesario (rojo), Necesario (ámbar), Capricho (azul). Definidas en `PRIORIDADES` en `App.jsx`.
- Orden automático por prioridad y luego por fecha (más reciente primero).
- Filtros por prioridad con contador; total en € de lo pendiente.
- Vista Pendientes / Comprados.
- Alta y edición en hoja inferior; marcar comprado; borrar con confirmación.
- Respeta `safe-area-inset` (notch y barra de gestos).

## Comandos

```bash
npm install
npm run dev          # navegador
npm run build
npx cap add android  # solo la primera vez
npm run android      # build + cap sync + abre Android Studio
```

## Estado

- `npm run build` compila sin errores y la app está probada en el navegador (alta, edición, filtros, comprado, borrado, persistencia).
- La carpeta `android/` ya está generada (`npx cap add android`) y en el repo. Falta probarla en Android Studio / en el móvil.
- Repo en GitHub (privado): `aropero8/antojo`, rama `main`.

## Convenciones

- UI, textos, nombres de variables y commits en **español**.
- Mantener dependencias al mínimo; preguntar antes de añadir librerías grandes.
- Si `App.jsx` crece mucho, se puede separar en componentes en `src/components/`.
- Git: la carpeta `android/` se sube; builds, `node_modules/`, `dist/` y claves de firma (`*.keystore`, `*.jks`) están en `.gitignore`. Nunca subir claves de firma.
- Mantener el README al día cuando cambie la funcionalidad o los comandos.

## Ideas pendientes (no hechas)

- Foto del producto con `@capacitor/camera`.
- Exportar/importar copia de seguridad en JSON.
- Icono y splash propios (`@capacitor/assets`).
- Licencia (MIT) si el repo se hace público.
