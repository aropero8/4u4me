import { createClient } from '@supabase/supabase-js';
import { Preferences } from '@capacitor/preferences';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const configurado = Boolean(url && anonKey);

// La sesión de Supabase se guarda con Preferences (almacenamiento nativo en
// Android; localStorage en el navegador) para que no se pierda.
const CLAVE_SESION = 'antojo_sesion';
const almacenSesion = {
  getItem: async (key) => (await Preferences.get({ key })).value,
  setItem: (key, value) => Preferences.set({ key, value }),
  removeItem: (key) => Preferences.remove({ key }),
};

export const supabase = configurado
  ? createClient(url, anonKey, {
      auth: {
        storage: almacenSesion,
        storageKey: CLAVE_SESION,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    })
  : null;

// Solo en desarrollo: permite consultar Supabase con la sesión actual desde
// la consola del navegador (útil para comprobar las políticas RLS).
if (import.meta.env.DEV) window.supabase = supabase;

// Quién usa este móvil: { uid, persona }. Se guarda aparte de la sesión de
// Supabase para poder abrir la app sin conexión aunque el token haya caducado.
const CLAVE_IDENTIDAD = 'antojo_identidad';

export async function leerIdentidad() {
  try {
    const { value } = await Preferences.get({ key: CLAVE_IDENTIDAD });
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

export async function iniciarSesion(persona, pin) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: persona.email,
    password: pin,
  });
  if (error) throw error;
  const identidad = { uid: data.user.id, persona: persona.id };
  await Preferences.set({ key: CLAVE_IDENTIDAD, value: JSON.stringify(identidad) });
  return identidad;
}

export async function olvidarIdentidad() {
  await Preferences.remove({ key: CLAVE_IDENTIDAD });
}

// Cierra la sesión solo en este móvil. Sin conexión, signOut() tarda en
// rendirse y no borra el token guardado: se espera poco y se borra a mano.
// (Supabase encola sus operaciones de sesión, así que un signOut tardío nunca
// adelanta a un inicio de sesión posterior.)
export async function cerrarSesion() {
  await olvidarIdentidad();
  const salida = supabase.auth.signOut({ scope: 'local' }).catch(() => {});
  await Promise.race([salida, new Promise((r) => setTimeout(r, navigator.onLine ? 3000 : 0))]);
  await Preferences.remove({ key: CLAVE_SESION });
}

// true si la sesión guardada ya no existe (no basta con estar sin conexión).
export async function sesionPerdida() {
  const { data, error } = await supabase.auth.getSession();
  return !error && !data.session;
}

export function esErrorDeRed(error) {
  const msg = String(error?.message ?? error);
  return (
    (typeof navigator !== 'undefined' && !navigator.onLine) ||
    error?.name === 'AuthRetryableFetchError' ||
    /failed to fetch|networkerror|load failed|network request failed/i.test(msg)
  );
}
