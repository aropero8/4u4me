import { useEffect, useMemo, useState } from 'react';
import { loadItems, saveItems } from './storage.js';

const PRIORIDADES = {
  muy: { label: 'Muy necesario', short: 'Muy necesario', orden: 0 },
  necesario: { label: 'Necesario', short: 'Necesario', orden: 1 },
  capricho: { label: 'Capricho', short: 'Capricho', orden: 2 },
};

const VACIO = { nombre: '', prioridad: 'necesario', precio: '', enlace: '', nota: '' };

const fmtPrecio = (n) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);

// Texto del formulario → número. '' si está vacío; NaN si no es un precio válido.
const leerPrecio = (v) => {
  const s = String(v).trim().replace(',', '.');
  if (s === '') return '';
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? n : NaN;
};

export default function App() {
  const [items, setItems] = useState([]);
  const [cargado, setCargado] = useState(false);
  const [filtro, setFiltro] = useState('todos');
  const [verComprados, setVerComprados] = useState(false);
  const [form, setForm] = useState(null); // null = cerrado; objeto = editando/creando

  useEffect(() => {
    loadItems().then((d) => {
      setItems(d);
      setCargado(true);
    });
  }, []);

  useEffect(() => {
    if (cargado) saveItems(items);
  }, [items, cargado]);

  const visibles = useMemo(() => {
    return items
      .filter((i) => (verComprados ? i.comprado : !i.comprado))
      .filter((i) => filtro === 'todos' || i.prioridad === filtro)
      .sort(
        (a, b) =>
          PRIORIDADES[a.prioridad].orden - PRIORIDADES[b.prioridad].orden ||
          b.creado - a.creado
      );
  }, [items, filtro, verComprados]);

  const pendientes = items.filter((i) => !i.comprado);
  const total = pendientes
    .filter((i) => filtro === 'todos' || i.prioridad === filtro)
    .reduce((s, i) => s + (Number(i.precio) || 0), 0);

  const contar = (p) => pendientes.filter((i) => i.prioridad === p).length;

  const precioInvalido = form !== null && Number.isNaN(leerPrecio(form.precio));

  function guardar(e) {
    e.preventDefault();
    const nombre = form.nombre.trim();
    if (!nombre || precioInvalido) return;
    const datos = {
      ...form,
      nombre,
      precio: leerPrecio(form.precio),
      enlace: form.enlace.trim(),
      nota: form.nota.trim(),
    };
    if (form.id) {
      setItems((prev) => prev.map((i) => (i.id === form.id ? { ...i, ...datos } : i)));
    } else {
      setItems((prev) => [
        { ...datos, id: crypto.randomUUID(), creado: Date.now(), comprado: false },
        ...prev,
      ]);
    }
    setForm(null);
  }

  const toggleComprado = (id) =>
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, comprado: !i.comprado } : i))
    );

  const borrar = (id) => {
    if (confirm('¿Eliminar este deseo?')) setItems((prev) => prev.filter((i) => i.id !== id));
  };

  return (
    <div className="app">
      <header className="top">
        <div>
          <h1>Antojo</h1>
          <p className="sub">
            {pendientes.length} pendiente{pendientes.length !== 1 && 's'}
            {total > 0 && ` · ${fmtPrecio(total)}`}
          </p>
        </div>
        <button
          className={`chip ghost ${verComprados ? 'on' : ''}`}
          onClick={() => setVerComprados((v) => !v)}
        >
          {verComprados ? 'Ver pendientes' : 'Comprados'}
        </button>
      </header>

      <nav className="filtros">
        <button className={`chip ${filtro === 'todos' ? 'on' : ''}`} onClick={() => setFiltro('todos')}>
          Todos
        </button>
        {Object.entries(PRIORIDADES).map(([k, p]) => (
          <button
            key={k}
            className={`chip p-${k} ${filtro === k ? 'on' : ''}`}
            onClick={() => setFiltro(k)}
          >
            {p.short} <span className="n">{contar(k)}</span>
          </button>
        ))}
      </nav>

      <main className="lista">
        {cargado && visibles.length === 0 && (
          <div className="vacio">
            {verComprados
              ? 'Aún no has marcado nada como comprado.'
              : 'Nada por aquí. Pulsa + para añadir algo que quieras o necesites.'}
          </div>
        )}
        {visibles.map((i) => (
          <article key={i.id} className={`item p-${i.prioridad} ${i.comprado ? 'hecho' : ''}`}>
            <button
              className="check"
              aria-label={i.comprado ? 'Marcar como pendiente' : 'Marcar como comprado'}
              onClick={() => toggleComprado(i.id)}
            >
              {i.comprado ? '✓' : ''}
            </button>
            <div
              className="cuerpo"
              onClick={() =>
                setForm({ ...VACIO, ...i, precio: String(i.precio ?? '').replace('.', ',') })
              }
            >
              <div className="fila">
                <h2>{i.nombre}</h2>
                {i.precio !== '' && i.precio != null && <span className="precio">{fmtPrecio(i.precio)}</span>}
              </div>
              <span className={`tag p-${i.prioridad}`}>{PRIORIDADES[i.prioridad].label}</span>
              {i.nota && <p className="nota">{i.nota}</p>}
              {i.enlace && (
                <a
                  className="enlace"
                  href={/^https?:\/\//.test(i.enlace) ? i.enlace : `https://${i.enlace}`}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                >
                  Abrir enlace ↗
                </a>
              )}
            </div>
            <button className="borrar" aria-label="Eliminar" onClick={() => borrar(i.id)}>
              ×
            </button>
          </article>
        ))}
      </main>

      {!form && (
        <button className="fab" aria-label="Añadir" onClick={() => setForm({ ...VACIO })}>
          +
        </button>
      )}

      {form && (
        <div className="overlay" onClick={() => setForm(null)}>
          <form className="hoja" onSubmit={guardar} onClick={(e) => e.stopPropagation()}>
            <h2>{form.id ? 'Editar deseo' : 'Nuevo deseo'}</h2>
            <label>
              ¿Qué es?
              <input
                autoFocus
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
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
                  onChange={(e) => setForm({ ...form, precio: e.target.value })}
                  placeholder="Opcional"
                />
              </label>
              <label>
                Enlace
                <input
                  inputMode="url"
                  value={form.enlace}
                  onChange={(e) => setForm({ ...form, enlace: e.target.value })}
                  placeholder="Opcional"
                />
              </label>
            </div>
            <label>
              Nota
              <textarea
                rows="2"
                value={form.nota}
                onChange={(e) => setForm({ ...form, nota: e.target.value })}
                placeholder="Talla, color, dónde lo viste…"
              />
            </label>
            <div className="acciones">
              <button type="button" className="btn ghost" onClick={() => setForm(null)}>
                Cancelar
              </button>
              <button type="submit" className="btn" disabled={!form.nombre.trim() || precioInvalido}>
                Guardar
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
