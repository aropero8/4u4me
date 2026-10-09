import { useState } from 'react';
import { fmtPrecio, urlDe, dominioDe } from '../modelo.js';
import Icono from './Icono.jsx';

// Tarjeta de un deseo. Si es editable (lista propia) se marca como comprado
// con el círculo y se edita o borra tocándola; si no, solo se puede reservar o
// anular la reserva propia.
export default function Deseo({ deseo, editable, reserva, acciones }) {
  const [ocupado, setOcupado] = useState(false);

  // Evita pulsar dos veces mientras se guarda.
  const mientras = (accion) => async () => {
    setOcupado(true);
    await accion();
    setOcupado(false);
  };

  const editar = editable ? () => acciones.editar(deseo) : undefined;
  const puedeReservar = !editable && !reserva && !deseo.comprado;

  return (
    <article
      className={`item p-${deseo.prioridad} ${deseo.comprado ? 'hecho' : ''} ${reserva ? 'reservado' : ''}`}
    >
      {editable && (
        <button
          className="check"
          aria-label={deseo.comprado ? 'Marcar como pendiente' : 'Marcar como comprado'}
          aria-pressed={deseo.comprado}
          disabled={ocupado}
          onClick={mientras(() => acciones.alternarComprado(deseo))}
        >
          <Icono nombre="check" tamano={14} />
        </button>
      )}
      <div
        className={`cuerpo ${editable ? 'editable' : ''}`}
        onClick={editar}
        onKeyDown={editable ? (e) => e.key === 'Enter' && editar() : undefined}
        role={editable ? 'button' : undefined}
        tabIndex={editable ? 0 : undefined}
        aria-label={editable ? `Editar ${deseo.nombre}` : undefined}
      >
        <div className="fila">
          <h4>{deseo.nombre}</h4>
          {deseo.precio !== '' && <span className="precio">{fmtPrecio(deseo.precio)}</span>}
        </div>
        {deseo.nota && <p className="nota">{deseo.nota}</p>}
        {(deseo.enlace || reserva || puedeReservar) && (
          <div className="pie">
            {deseo.enlace && (
              <a
                className="enlace"
                href={urlDe(deseo.enlace)}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
              >
                <Icono nombre="enlace" tamano={14} />
                <span>{dominioDe(deseo.enlace)}</span>
              </a>
            )}
            {!editable && reserva && (
              <div className="reserva">
                <span className="reservado-txt">
                  <Icono nombre="regalo" tamano={16} />
                  {deseo.comprado ? 'Lo reservaste tú' : 'Lo regalas tú'}
                </span>
                <button
                  className="anular"
                  disabled={ocupado}
                  onClick={mientras(() => acciones.anularReserva(reserva))}
                >
                  Anular
                </button>
              </div>
            )}
            {puedeReservar && (
              <button className="regalo" disabled={ocupado} onClick={mientras(() => acciones.reservar(deseo))}>
                <Icono nombre="regalo" tamano={16} />
                Lo regalo yo
              </button>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
