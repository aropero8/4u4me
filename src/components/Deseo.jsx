import { useState } from 'react';
import { PRIORIDADES, fmtPrecio } from '../modelo.js';

const urlDe = (enlace) => (/^https?:\/\//.test(enlace) ? enlace : `https://${enlace}`);

// Tarjeta de un deseo. Si es editable (lista propia) se puede marcar, editar y
// borrar; si no, solo se puede reservar o anular la reserva propia.
export default function Deseo({ deseo, editable, reserva, acciones }) {
  const [ocupado, setOcupado] = useState(false);

  // Evita pulsar dos veces mientras se guarda.
  const mientras = (accion) => async () => {
    setOcupado(true);
    await accion();
    setOcupado(false);
  };

  return (
    <article className={`item p-${deseo.prioridad} ${deseo.comprado ? 'hecho' : ''}`}>
      {editable && (
        <button
          className="check"
          aria-label={deseo.comprado ? 'Marcar como pendiente' : 'Marcar como comprado'}
          disabled={ocupado}
          onClick={mientras(() => acciones.alternarComprado(deseo))}
        >
          {deseo.comprado ? '✓' : ''}
        </button>
      )}
      <div
        className={`cuerpo ${editable ? 'editable' : ''}`}
        onClick={editable ? () => acciones.editar(deseo) : undefined}
      >
        <div className="fila">
          <h2>{deseo.nombre}</h2>
          {deseo.precio !== '' && <span className="precio">{fmtPrecio(deseo.precio)}</span>}
        </div>
        <span className={`tag p-${deseo.prioridad}`}>{PRIORIDADES[deseo.prioridad].label}</span>
        {deseo.nota && <p className="nota">{deseo.nota}</p>}
        {deseo.enlace && (
          <a
            className="enlace"
            href={urlDe(deseo.enlace)}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
          >
            Abrir enlace ↗
          </a>
        )}
        {!editable && reserva && (
          <div className="reserva">
            <span className="reservado">🎁 Reservado por ti</span>
            <button className="btn ghost" disabled={ocupado} onClick={mientras(() => acciones.anularReserva(reserva))}>
              Anular
            </button>
          </div>
        )}
        {!editable && !reserva && !deseo.comprado && (
          <button className="regalo" disabled={ocupado} onClick={mientras(() => acciones.reservar(deseo))}>
            🎁 Lo regalo yo
          </button>
        )}
      </div>
      {editable && (
        <button className="borrar" aria-label="Eliminar" onClick={() => acciones.borrarDeseo(deseo)}>
          ×
        </button>
      )}
    </article>
  );
}
