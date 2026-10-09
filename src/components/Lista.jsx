import { useMemo, useState } from 'react';
import { PRIORIDADES, ordenarDeseos, fmtPrecio, sumaPrecios } from '../modelo.js';
import Deseo from './Deseo.jsx';
import Icono from './Icono.jsx';

const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;

// Lista de una persona: lo pendiente agrupado por prioridad y lo comprado
// plegado al final. La propia se edita; la de la otra persona es de solo
// lectura y permite reservar ("Lo regalo yo").
export default function Lista({ nombre, otro, esMia, deseos, reservas, acciones, onAnadir }) {
  const [verComprados, setVerComprados] = useState(false);

  const reservaDe = useMemo(() => new Map(reservas.map((r) => [r.deseo_id, r])), [reservas]);

  const pendientes = useMemo(() => deseos.filter((d) => !d.comprado).sort(ordenarDeseos), [deseos]);
  const comprados = useMemo(() => deseos.filter((d) => d.comprado).sort((a, b) => b.creado - a.creado), [deseos]);
  const grupos = Object.entries(PRIORIDADES)
    .map(([k, p]) => ({ k, label: p.label, deseos: pendientes.filter((d) => d.prioridad === k) }))
    .filter((g) => g.deseos.length);

  const total = sumaPrecios(pendientes);
  const misRegalos = esMia ? [] : pendientes.filter((d) => reservaDe.has(d.id));

  const tarjetas = (lista) => (
    <div className="lista">
      {lista.map((d) => (
        <Deseo key={d.id} deseo={d} editable={esMia} reserva={reservaDe.get(d.id)} acciones={acciones} />
      ))}
    </div>
  );

  return (
    <>
      {pendientes.length > 0 && (
        <div className="resumen">
          <p>
            <b>{plural(pendientes.length, 'deseo', 'deseos')}</b> {pendientes.length === 1 ? 'pendiente' : 'pendientes'}
          </p>
          {total > 0 && <p className="total">{fmtPrecio(total)}</p>}
        </div>
      )}
      {misRegalos.length > 0 && (
        <p className="mis-regalos">
          <Icono nombre="regalo" tamano={16} />
          Le regalas {plural(misRegalos.length, 'cosa', 'cosas')}
          {sumaPrecios(misRegalos) > 0 && ` · ${fmtPrecio(sumaPrecios(misRegalos))}`}
        </p>
      )}

      {pendientes.length === 0 && <Vacio esMia={esMia} nombre={nombre} otro={otro} hayComprados={comprados.length > 0} onAnadir={onAnadir} />}

      {grupos.map((g) => (
        <section key={g.k} className={`grupo p-${g.k}`}>
          <h3 className="grupo-titulo">
            <span className="punto" />
            {g.label}
            <span className="n">{g.deseos.length}</span>
            {g.deseos.length > 1 && sumaPrecios(g.deseos) > 0 && (
              <span className="subtotal">{fmtPrecio(sumaPrecios(g.deseos))}</span>
            )}
          </h3>
          {tarjetas(g.deseos)}
        </section>
      ))}

      {comprados.length > 0 && (
        <section className="grupo comprados">
          <h3>
            <button className="grupo-titulo" aria-expanded={verComprados} onClick={() => setVerComprados((v) => !v)}>
              Comprados
              <span className="n">{comprados.length}</span>
              <Icono nombre="abajo" tamano={18} className="flecha" />
            </button>
          </h3>
          {verComprados && tarjetas(comprados)}
        </section>
      )}

      {deseos.length > 0 && (
        <p className="pista">
          {esMia ? (
            'Toca un deseo para editarlo o borrarlo.'
          ) : (
            <>
              <Icono nombre="candado" tamano={14} />
              {nombre} no ve lo que le reservas.
            </>
          )}
        </p>
      )}
    </>
  );
}

function Vacio({ esMia, nombre, otro, hayComprados, onAnadir }) {
  if (esMia) {
    return (
      <div className="vacio">
        <span className="emoji" aria-hidden="true">{hayComprados ? '🎉' : '✨'}</span>
        <h3>{hayComprados ? '¡Lo tienes todo!' : 'Tu lista está vacía'}</h3>
        <p>
          {hayComprados
            ? '¿Se te antoja algo más?'
            : `Apunta lo que te apetece o necesitas; ${otro} lo verá al momento.`}
        </p>
        <button className="btn" onClick={onAnadir}>
          <Icono nombre="mas" tamano={18} />
          Añadir un deseo
        </button>
      </div>
    );
  }
  return (
    <div className="vacio">
      <span className="emoji" aria-hidden="true">{hayComprados ? '🎉' : '🌱'}</span>
      <h3>{hayComprados ? `${nombre} lo tiene todo` : `${nombre} aún no ha apuntado nada`}</h3>
      <p>Cuando añada algo, aparecerá aquí al momento.</p>
    </div>
  );
}
