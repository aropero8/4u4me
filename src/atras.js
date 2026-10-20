import { useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';

// Hace que "Atrás" (botón del navegador o gesto del móvil) cierre la capa
// abierta (hoja o menú) en vez de salir de la app: al abrirla se añade una
// entrada al historial, y al volver atrás se cierra la capa de arriba.

const capas = []; // cerrar() de cada capa abierta, la de arriba al final
let retrocesosPropios = 0; // history.back() hechos al cerrar una capa por otra vía

// En la app Android el botón Atrás no toca el historial por sí solo: con una
// capa abierta se vuelve atrás (y se cierra); si no hay ninguna, se sale.
if (Capacitor.isNativePlatform()) {
  App.addListener('backButton', () => (capas.length ? history.back() : App.exitApp()));
}

window.addEventListener('popstate', () => {
  if (retrocesosPropios) {
    retrocesosPropios--;
    return;
  }
  const capa = capas.pop();
  if (capa) {
    capa.porAtras = true;
    capa.cerrar();
  }
});

export function useAtrasCierra(abierta, cerrar) {
  const ultimoCerrar = useRef(cerrar);
  ultimoCerrar.current = cerrar;

  useEffect(() => {
    if (!abierta) return;
    const capa = { cerrar: () => ultimoCerrar.current(), porAtras: false };
    capas.push(capa);
    history.pushState({ capa: true }, '');
    return () => {
      if (capa.porAtras) return;
      // Se cerró con un botón: se quita su entrada del historial.
      capas.splice(capas.indexOf(capa), 1);
      retrocesosPropios++;
      history.back();
    };
  }, [abierta]);
}
