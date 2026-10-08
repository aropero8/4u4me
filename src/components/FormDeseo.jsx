import { useState } from 'react';
import { PRIORIDADES, leerPrecio } from '../modelo.js';

const VACIO = { nombre: '', prioridad: 'necesario', precio: '', enlace: '', nota: '' };

// Hoja inferior para crear o editar un deseo propio. Solo se cierra si se
// guarda bien; si falla (por ejemplo, sin conexión) se conservan los datos.
export default function FormDeseo({ inicial, onGuardar, onCerrar }) {
  const [form, setForm] = useState(() => ({
    ...VACIO,
    ...inicial,
    precio: String(inicial.precio ?? '').replace('.', ','),
  }));
  const [guardando, setGuardando] = useState(false);

  const precioInvalido = Number.isNaN(leerPrecio(form.precio));
  const cambiar = (campo) => (e) => setForm({ ...form, [campo]: e.target.value });

  async function guardar(e) {
    e.preventDefault();
    const nombre = form.nombre.trim();
    if (!nombre || precioInvalido || guardando) return;
    setGuardando(true);
    try {
      await onGuardar({
        ...form,
        nombre,
        precio: leerPrecio(form.precio),
        enlace: form.enlace.trim(),
        nota: form.nota.trim(),
      });
      onCerrar();
    } catch {
      setGuardando(false);
    }
  }

  return (
    <div className="overlay" onClick={onCerrar}>
      <form className="hoja" onSubmit={guardar} onClick={(e) => e.stopPropagation()}>
        <h2>{form.id ? 'Editar deseo' : 'Nuevo deseo'}</h2>
        <label>
          ¿Qué es?
          <input
            autoFocus
            value={form.nombre}
            onChange={cambiar('nombre')}
            placeholder="Ej. Auriculares inalámbricos"
          />
        </label>
        <div className="label">Prioridad</div>
        <div className="segmentos">
          {Object.entries(PRIORIDADES).map(([k, p]) => (
            <button
              type="button"
              key={k}
              className={`seg p-${k} ${form.prioridad === k ? 'on' : ''}`}
              onClick={() => setForm({ ...form, prioridad: k })}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="dos">
          <label>
            Precio (€)
            <input
              inputMode="decimal"
              aria-invalid={precioInvalido}
              value={form.precio}
              onChange={cambiar('precio')}
              placeholder="Opcional"
            />
          </label>
          <label>
            Enlace
            <input inputMode="url" value={form.enlace} onChange={cambiar('enlace')} placeholder="Opcional" />
          </label>
        </div>
        <label>
          Nota
          <textarea rows="2" value={form.nota} onChange={cambiar('nota')} placeholder="Talla, color, dónde lo viste…" />
        </label>
        <div className="acciones">
          <button type="button" className="btn ghost" onClick={onCerrar}>
            Cancelar
          </button>
          <button type="submit" className="btn" disabled={!form.nombre.trim() || precioInvalido || guardando}>
            {guardando ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </form>
    </div>
  );
}
