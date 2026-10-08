import { useMemo, useState } from 'react';
import { PRIORIDADES, ordenarDeseos, fmtPrecio } from '../modelo.js';
import Deseo from './Deseo.jsx';

// Lista de una persona. La propia se edita; la de la otra persona es de solo
// lectura y permite reservar ("Lo regalo yo").
export default function Lista({ nombre, esMia, deseos, reservas, acciones }) {
  const [filtro, setFiltro] = useState('todos');
  const [verComprados, setVerComprados] = useState(false);

  const reservaDe = useMemo(() => new Map(reservas.map((r) => [r.deseo_id, r])), [reservas]);

  const visibles = useMemo(
    () =>
      deseos
        .filter((d) => (verComprados ? d.comprado : !d.comprado))
        .filter((d) => filtro === 'todos' || d.prioridad === filtro)
        .sort(ordenarDeseos),
    [deseos, filtro, verComprados]
  );

  const pendientes = deseos.filter((d) => !d.comprado);
  const total = pendientes
    .filter((d) => filtro === 'todos' || d.prioridad === filtro)
    .reduce((s, d) => s + (Number(d.precio) || 0), 0);
  const contar = (p) => pendientes.filter((d) => d.prioridad === p).length;

  let vacio;
  if (filtro !== 'todos') vacio = 'No hay nada con esta prioridad.';
  else if (verComprados) vacio = esMia ? 'Aún no has marcado nada como comprado.' : `${nombre} aún no ha comprado nada de su lista.`;
  else vacio = esMia ? 'Nada por aquí. Pulsa + para añadir algo que quieras o necesites.' : `${nombre} aún no ha apuntado nada.`;

  return (
    <>
      <div className="resumen">
        <p className="sub">
          {pendientes.length} pendiente{pendientes.length !== 1 && 's'}
          {total > 0 && ` · ${fmtPrecio(total)}`}
        </p>
        <button className={`chip ghost ${verComprados ? 'on' : ''}`} onClick={() => setVerComprados((v) => !v)}>
          {verComprados ? 'Ver pendientes' : 'Comprados'}
        </button>
      </div>

      <nav className="filtros">
        <button className={`chip ${filtro === 'todos' ? 'on' : ''}`} onClick={() => setFiltro('todos')}>
          Todos
        </button>
        {Object.entries(PRIORIDADES).map(([k, p]) => (
          <button key={k} className={`chip p-${k} ${filtro === k ? 'on' : ''}`} onClick={() => setFiltro(k)}>
            {p.label} <span className="n">{contar(k)}</span>
          </button>
        ))}
      </nav>

      <div className="lista">
        {visibles.length === 0 && <div className="vacio">{vacio}</div>}
        {visibles.map((d) => (
          <Deseo key={d.id} deseo={d} editable={esMia} reserva={reservaDe.get(d.id)} acciones={acciones} />
        ))}
      </div>
    </>
  );
}
