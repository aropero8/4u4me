# Antojo

Wishlist personal para Android, hecha con **React + Vite** y empaquetada con **Capacitor**.

La idea es sencilla: cuando quieres o necesitas algo, lo apuntas, le pones una prioridad y lo tienes a mano en el móvil.

## Funciones

- Cada deseo tiene **nombre** y **prioridad**: Muy necesario, Necesario o Capricho.
- Opcionalmente: **precio**, **enlace** a la tienda y una **nota** (talla, color…).
- Lista ordenada por prioridad, con filtros y contador por categoría.
- Total en euros de lo pendiente.
- Marcar como comprado, editar y borrar.
- Datos guardados en el propio dispositivo (`@capacitor/preferences`); en el navegador usa localStorage. Sin servidor ni cuentas.

## Requisitos

- Node.js 20 o superior
- Android Studio (solo para generar la app Android)

## Probar en el navegador

```bash
npm install
npm run dev
```

## Generar la app Android

La primera vez, crea el proyecto nativo:

```bash
npm run build
npx cap add android
```

Después, cada vez que cambies el código:

```bash
npm run android   # build + sync + abre Android Studio
```

En Android Studio pulsa ▶ con el móvil conectado (depuración USB activada) o genera el APK desde *Build → Build APK(s)*.

## Estructura

```
src/
  App.jsx      # interfaz y lógica de la lista
  App.css      # estilos
  storage.js   # guardado con Capacitor Preferences
  main.jsx     # punto de entrada
capacitor.config.json
vite.config.js
```

## Notas

- La carpeta `android/` se sube al repo (así lo recomienda Capacitor); sus builds y las claves de firma (`*.keystore`, `*.jks`) están en `.gitignore`.
- El identificador de la app es `com.alberto.antojo` (en `capacitor.config.json`).
