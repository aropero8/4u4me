// Prioridades, orden y formato de los deseos.

export const PRIORIDADES = {
  muy: { label: 'Muy necesario', orden: 0 },
  necesario: { label: 'Necesario', orden: 1 },
  capricho: { label: 'Capricho', orden: 2 },
};

// Por prioridad y, dentro de cada una, el más reciente primero.
export const ordenarDeseos = (a, b) =>
  PRIORIDADES[a.prioridad].orden - PRIORIDADES[b.prioridad].orden || b.creado - a.creado;

export const fmtPrecio = (n) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);

// Texto del formulario → número. '' si está vacío; NaN si no es un precio válido.
export const leerPrecio = (v) => {
  const s = String(v).trim().replace(',', '.');
  if (s === '') return '';
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? n : NaN;
};
