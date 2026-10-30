import { useEffect, useRef, useState } from 'react';
import { PRIORIDADES, GANAS, GANAS_POR_DEFECTO, leerPrecio } from '../modelo.js';
import { useAtrasCierra } from '../atras.js';
import Icono from './Icono.jsx';

const VACIO = { nombre: '', prioridad: 'necesario', ganas: GANAS_POR_DEFECTO, precio: '', enlace: '', nota: '' };
const CAMPOS = Object.keys(VACIO);

// Hoja inferior para crear o editar un deseo propio. Solo se cierra si se
// guarda (o se borra) bien; si falla, por ejemplo sin conexión, se conservan
// los datos. Tocar fuera la cierra solo si no se ha cambiado nada.
export default function FormDeseo({ inicial, onGuardar, onBorrar, onCerrar }) {
  const [original] = useState(() => ({
    ...VACIO,
    ...inicial,
    precio: String(inicial.precio ?? '').replace('.', ','),
  }));
  const [form, setForm] = useState(original);
  const [ocupado, setOcupado] = useState(false);
  const [confirmarBorrado, setConfirmarBorrado] = useState(false);

  const editando = Boolean(form.id);
  const precioInvalido = Number.isNaN(leerPrecio(form.precio));
  const modificado = CAMPOS.some((c) => form[c] !== original[c]);
  const cambiar = (campo) => (e) => setForm({ ...form, [campo]: e.target.value });

  useAtrasCierra(true, onCerrar);
  useEffect(() => {
    const alPulsar = (e) => e.key === 'Escape' && onCerrar();
    window.addEventListener('keydown', alPulsar);
    return () => window.removeEventListener('keydown', alPulsar);
  }, [onCerrar]);

  // En iOS (y en navegadores que no encogen la página) el teclado tapa la parte
  // de abajo: la hoja se sube lo que ocupe (--teclado).
  const fondo = useRef(null);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const ajustar = () =>
      fondo.current?.style.setProperty('--teclado', `${Math.max(0, window.innerHeight - vv.height - vv.offsetTop)}px`);
    vv.addEventListener('resize', ajustar);
    vv.addEventListener('scroll', ajustar);
    return () => {
      vv.removeEventListener('resize', ajustar);
      vv.removeEventListener('scroll', ajustar);
    };
  }, []);

  // Si se pega un enlace en el nombre (lo normal al copiarlo de una tienda),
  // va al campo Enlace.
  function pegarEnNombre(e) {
    const texto = e.clipboardData.getData('text').trim();
    if (!/^(https?:\/\/|www\.)\S+$/i.test(texto) || form.enlace.trim()) return;
    e.preventDefault();
    setForm({ ...form, enlace: texto });
  }

  // Ejecuta guardar o borrar; si falla, la hoja sigue abierta con los datos.
  async function hacer(operacion) {
    setOcupado(true);
    try {
      await operacion();
      onCerrar();
    } catch {
      setOcupado(false);
      setConfirmarBorrado(false);
    }
  }

  function guardar(e) {
    e.preventDefault();
    const nombre = form.nombre.trim();
    if (!nombre || precioInvalido || ocupado) return;
    hacer(() =>
      onGuardar({
        ...form,
        nombre,
        precio: leerPrecio(form.precio),
        enlace: form.enlace.trim(),
        nota: form.nota.trim(),
      })
    );
  }

  return (
    <div className="overlay" ref={fondo} onClick={() => !modificado && !ocupado && onCerrar()}>
      <form
        className="hoja"
        onSubmit={guardar}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-hoja"
      >
        <div className="hoja-cabecera">
          <h2 id="titulo-hoja">{editando ? 'Editar deseo' : 'Nuevo deseo'}</h2>
          <button type="button" className="icono-btn" aria-label="Cerrar" onClick={onCerrar}>
            <Icono nombre="cerrar" />
          </button>
        </div>

        <label>
          ¿Qué te apetece?
          <input
            className="campo-nombre"
            autoFocus={!editando}
            value={form.nombre}
            onChange={cambiar('nombre')}
            onPaste={pegarEnNombre}
            placeholder="Ej. Auriculares inalámbricos"
            autoCapitalize="sentences"
            enterKeyHint="done"
          />
        </label>

        <div className="campo">
          <span className="label" id="etiqueta-prioridad">
            Prioridad
          </span>
          <div className="segmentos" role="radiogroup" aria-labelledby="etiqueta-prioridad">
            {Object.entries(PRIORIDADES).map(([k, p]) => (
              <button
                type="button"
                key={k}
                role="radio"
                aria-checked={form.prioridad === k}
                className={`seg p-${k} ${form.prioridad === k ? 'on' : ''}`}
                onClick={() => setForm({ ...form, prioridad: k })}
              >
                <span className="punto" />
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {form.prioridad === 'capricho' && (
          <div className="campo">
            <span className="label" id="etiqueta-ganas">
              ¿Cuántas ganas?
            </span>
            <div className="ganas-selector p-capricho">
              <div role="radiogroup" aria-labelledby="etiqueta-ganas">
                {Object.entries(GANAS).map(([n, texto]) => (
                  <button
                    type="button"
                    key={n}
                    role="radio"
                    aria-checked={form.ganas === Number(n)}
                    aria-label={texto}
                    className={Number(n) <= form.ganas ? 'on' : ''}
                    onClick={() => setForm({ ...form, ganas: Number(n) })}
                  >
                    <Icono nombre="corazon" tamano={26} />
                  </button>
                ))}
              </div>
              <span aria-hidden="true">{GANAS[form.ganas]}</span>
            </div>
          </div>
        )}

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
            <input
              inputMode="url"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck="false"
              value={form.enlace}
              onChange={cambiar('enlace')}
              placeholder="Opcional"
            />
          </label>
        </div>
        {precioInvalido && <p className="error">Escribe el precio con números, por ejemplo 24,90.</p>}

        <label>
          Nota
          <textarea rows="2" autoCapitalize="sentences" value={form.nota} onChange={cambiar('nota')} placeholder="Talla, color, dónde lo viste…" />
        </label>

        {confirmarBorrado ? (
          <div className="confirmar">
            <p>¿Eliminar «{original.nombre}»? No se puede deshacer.</p>
            <div className="acciones">
              <button type="button" className="btn suave" disabled={ocupado} onClick={() => setConfirmarBorrado(false)}>
                Cancelar
              </button>
              <button type="button" className="btn peligro" disabled={ocupado} onClick={() => hacer(() => onBorrar(form))}>
                {ocupado ? 'Eliminando…' : 'Eliminar'}
              </button>
            </div>
          </div>
        ) : (
          <div className="acciones">
            {editando && (
              <button type="button" className="btn texto-peligro" disabled={ocupado} onClick={() => setConfirmarBorrado(true)}>
                <Icono nombre="papelera" tamano={18} />
                Eliminar
              </button>
            )}
            <button type="submit" className="btn principal" disabled={!form.nombre.trim() || precioInvalido || ocupado}>
              {ocupado ? 'Guardando…' : editando ? 'Guardar cambios' : 'Añadir a mi lista'}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
