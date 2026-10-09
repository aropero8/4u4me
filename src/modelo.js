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

// Suma de precios; los deseos sin precio ('') cuentan 0.
export const sumaPrecios = (deseos) => deseos.reduce((s, d) => s + (Number(d.precio) || 0), 0);

export const urlDe = (enlace) => (/^https?:\/\//i.test(enlace) ? enlace : `https://${enlace}`);

// Lo que se muestra de un enlace: el dominio sin "www." ("amazon.es").
export const dominioDe = (enlace) => {
  try {
    return new URL(urlDe(enlace)).hostname.replace(/^www\./, '') || 'Enlace';
  } catch {
    return 'Enlace';
  }
};

// Texto del formulario → número. '' si está vacío; NaN si no es un precio válido.
export const leerPrecio = (v) => {
  const s = String(v).trim().replace(',', '.');
  if (s === '') return '';
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? n : NaN;
};
