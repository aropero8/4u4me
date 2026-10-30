// Prioridades, orden y formato de los deseos.

export const PRIORIDADES = {
  muy: { label: 'Muy necesario', orden: 0 },
  necesario: { label: 'Necesario', orden: 1 },
  capricho: { label: 'Capricho', orden: 2 },
};

// Cuántas ganas hay de un capricho (1 a 3 corazones). En las otras prioridades
// se guarda pero no cuenta.
export const GANAS = { 1: 'Me apetece', 2: 'Me haría ilusión', 3: '¡Me encantaría!' };
export const GANAS_POR_DEFECTO = 2;

const ganasDe = (d) => (d.prioridad === 'capricho' ? d.ganas : 0);

// Por prioridad; los caprichos, por ganas; y a igualdad, el más reciente primero.
export const ordenarDeseos = (a, b) =>
  PRIORIDADES[a.prioridad].orden - PRIORIDADES[b.prioridad].orden ||
  ganasDe(b) - ganasDe(a) ||
  b.creado - a.creado;

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
// Admite "24,90", "24.90" y "24,90 €".
export const leerPrecio = (v) => {
  const s = String(v).replace(/[\s€]/g, '').replace(',', '.');
  if (s === '') return '';
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? n : NaN;
};
