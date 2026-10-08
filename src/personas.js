// Las dos personas de Antojo, en el orden de las pestañas.
// Los emails deben coincidir con las cuentas creadas en Supabase Auth y con
// privado.nombre_de_miembro() en supabase/schema.sql. El PIN es la contraseña.
export const PERSONAS = [
  { id: 'alberto', nombre: 'Alberto', email: 'alberto@antojo.local' },
  { id: 'alba', nombre: 'Alba', email: 'alba@antojo.local' },
];

export const personaPorId = (id) => PERSONAS.find((p) => p.id === id);
