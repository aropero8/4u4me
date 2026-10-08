import { Preferences } from '@capacitor/preferences';
import { supabase } from './supabase.js';
import { PRIORIDADES } from './modelo.js';

const COLUMNAS_DESEO = 'id, propietario, nombre, prioridad, precio, enlace, nota, comprado, creado';
const COLUMNAS_RESERVA = 'id, deseo_id, reservado_por, fecha';

// Fila de la base de datos → deseo de la app (precio '' = sin precio; creado en ms).
const aDeseo = (fila) => ({
  ...fila,
  precio: fila.precio ?? '',
  creado: Date.parse(fila.creado),
});

// Deseo de la app → columnas editables. Los campos que no vienen no se tocan.
const aFila = (d) => ({
  nombre: d.nombre,
  prioridad: d.prioridad,
  precio: d.precio === '' ? null : d.precio,
  enlace: d.enlace,
  nota: d.nota,
  comprado: d.comprado,
});

const comprobar = ({ data, error }) => {
  if (error) throw error;
  return data;
};

// ---------------------------------------------------------------------------
// Lectura y cambios
// ---------------------------------------------------------------------------

// Todo lo que la sesión actual puede ver. Las reservas que llegan son solo las
// de la lista de la otra persona: las de la propia las oculta RLS.
export async function cargarDatos() {
  const [perfiles, deseos, reservas] = await Promise.all([
    supabase.from('perfiles').select('id, nombre'),
    supabase.from('deseos').select(COLUMNAS_DESEO),
    supabase.from('reservas').select(COLUMNAS_RESERVA),
  ]);
  return {
    perfiles: comprobar(perfiles),
    deseos: comprobar(deseos).map(aDeseo),
    reservas: comprobar(reservas),
  };
}

export async function crearDeseo(deseo) {
  const fila = { ...aFila(deseo), comprado: false };
  return aDeseo(comprobar(await supabase.from('deseos').insert(fila).select(COLUMNAS_DESEO).single()));
}

export async function actualizarDeseo(id, cambios) {
  return aDeseo(
    comprobar(await supabase.from('deseos').update(aFila(cambios)).eq('id', id).select(COLUMNAS_DESEO).single())
  );
}

export async function borrarDeseo(id) {
  comprobar(await supabase.from('deseos').delete().eq('id', id));
}

export async function reservar(deseoId) {
  return comprobar(
    await supabase.from('reservas').insert({ deseo_id: deseoId }).select(COLUMNAS_RESERVA).single()
  );
}

export async function anularReserva(id) {
  comprobar(await supabase.from('reservas').delete().eq('id', id));
}

// ---------------------------------------------------------------------------
// Tiempo real
// ---------------------------------------------------------------------------

// Llama a alCambiar cuando cambia algo visible para esta sesión (Realtime
// aplica las mismas políticas RLS) y cada vez que la conexión se (re)establece,
// para recuperar lo que se haya perdido mientras tanto.
export function suscribirCambios(alCambiar) {
  // Nombre único: si no, Realtime podría devolver un canal que aún se está cerrando.
  const canal = supabase
    .channel(`antojo-${crypto.randomUUID()}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'deseos' }, alCambiar)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'reservas' }, alCambiar)
    .subscribe((estado) => {
      if (estado === 'SUBSCRIBED') alCambiar();
    });
  return () => supabase.removeChannel(canal);
}

// ---------------------------------------------------------------------------
// Copia local para ver la app sin conexión
// ---------------------------------------------------------------------------

const CLAVE_COPIA = 'antojo_copia';

// Solo se devuelve si es de la misma cuenta: las reservas de una persona no
// deben verse si otra entra en el mismo móvil.
export async function leerCopia(uid) {
  try {
    const { value } = await Preferences.get({ key: CLAVE_COPIA });
    const copia = value ? JSON.parse(value) : null;
    return copia?.uid === uid ? copia : null;
  } catch {
    return null;
  }
}

export async function guardarCopia(uid, datos) {
  await Preferences.set({ key: CLAVE_COPIA, value: JSON.stringify({ uid, ...datos }) });
}

export async function borrarCopia() {
  await Preferences.remove({ key: CLAVE_COPIA });
}

// ---------------------------------------------------------------------------
// Migración desde la versión solo local
// ---------------------------------------------------------------------------

const CLAVE_ANTIGUA = 'wishlist_items';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Sube a la lista de uid los deseos que la versión anterior guardaba en el
// móvil y borra esa copia. Devuelve cuántos había. Conserva los ids, así que
// si se corta a medias y se repite, no se duplica nada.
export async function migrarDeseosLocales(uid) {
  const { value } = await Preferences.get({ key: CLAVE_ANTIGUA });
  if (value == null) return 0;

  let antiguos;
  try {
    antiguos = JSON.parse(value);
  } catch {
    antiguos = [];
  }
  if (!Array.isArray(antiguos)) antiguos = [];

  const filas = antiguos
    .filter((d) => d && String(d.nombre ?? '').trim())
    .map((d) => ({
      id: UUID.test(d.id) ? d.id : crypto.randomUUID(),
      propietario: uid,
      nombre: String(d.nombre).trim(),
      prioridad: PRIORIDADES[d.prioridad] ? d.prioridad : 'necesario',
      precio: Number.isFinite(d.precio) && d.precio >= 0 ? d.precio : null,
      enlace: String(d.enlace ?? ''),
      nota: String(d.nota ?? ''),
      comprado: Boolean(d.comprado),
      creado: new Date(Number.isFinite(d.creado) ? d.creado : Date.now()).toISOString(),
    }));

  if (filas.length) {
    comprobar(await supabase.from('deseos').upsert(filas, { onConflict: 'id', ignoreDuplicates: true }));
  }
  await Preferences.remove({ key: CLAVE_ANTIGUA });
  return filas.length;
}
