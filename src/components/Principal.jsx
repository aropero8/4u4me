import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { PERSONAS } from '../personas.js';
import { esErrorDeRed } from '../supabase.js';
import {
  cargarDatos,
  crearDeseo,
  actualizarDeseo,
  borrarDeseo,
  reservar,
  anularReserva,
  suscribirCambios,
  leerCopia,
  guardarCopia,
  migrarDeseosLocales,
} from '../datos.js';
import Lista from './Lista.jsx';
import FormDeseo from './FormDeseo.jsx';
import Icono from './Icono.jsx';
import Logo from './Logo.jsx';

const mensajeDeError = (e) =>
  esErrorDeRed(e) ? 'Sin conexión: no se ha guardado el cambio.' : `No se ha guardado el cambio (${e?.message ?? e}).`;

export default function Principal({ uid, persona, onSalir }) {
  const [datos, setDatos] = useState(null); // { perfiles, deseos, reservas }
  const [conexion, setConexion] = useState(navigator.onLine ? 'cargando' : 'sin-conexion'); // o 'ok'
  const [aviso, setAviso] = useState(null); // { texto, deshacer? }
  const [form, setForm] = useState(null); // null = cerrado; objeto = creando/editando
  const [menu, setMenu] = useState(null); // null = cerrado; 'abierto'; 'salir' = confirmando
  const indiceMio = PERSONAS.findIndex((p) => p.id === persona.id);
  const [pestana, setPestana] = useState(indiceMio);
  const carril = useRef(null);
  const pestanas = useRef(null);

  const avisar = (texto, deshacer) => setAviso({ texto, deshacer });

  // --- Datos -------------------------------------------------------------

  // Solo se aplica la respuesta de la última petición, por si llegan desordenadas.
  const ultimaPeticion = useRef(0);
  const refrescar = useCallback(async () => {
    const n = ++ultimaPeticion.current;
    try {
      const d = await cargarDatos();
      if (n !== ultimaPeticion.current) return;
      setDatos(d);
      setConexion('ok');
      guardarCopia(uid, d);
    } catch {
      if (n === ultimaPeticion.current) setConexion('sin-conexion');
    }
  }, [uid]);

  // Agrupa ráfagas de cambios en tiempo real en una sola recarga.
  const temporizador = useRef(null);
  const programarRefresco = useCallback(() => {
    clearTimeout(temporizador.current);
    temporizador.current = setTimeout(refrescar, 250);
  }, [refrescar]);

  useEffect(() => {
    let activo = true;

    leerCopia(uid).then((copia) => {
      if (activo && copia) setDatos((actual) => actual ?? copia);
    });

    (async () => {
      if (persona.id === 'alberto') {
        try {
          const n = await migrarDeseosLocales(uid);
          if (n && activo) avisar(`Se han subido a tu lista ${n} deseos que estaban guardados solo en el móvil.`);
        } catch {
          if (activo) avisar('No se han podido subir los deseos guardados en el móvil. Se volverá a intentar.');
        }
      }
      if (activo) refrescar();
    })();

    const desuscribir = suscribirCambios(programarRefresco);
    const alVolver = () => document.visibilityState === 'visible' && refrescar();
    const alPerderConexion = () => setConexion('sin-conexion');
    window.addEventListener('online', refrescar);
    window.addEventListener('offline', alPerderConexion);
    document.addEventListener('visibilitychange', alVolver);

    return () => {
      activo = false;
      clearTimeout(temporizador.current);
      desuscribir();
      window.removeEventListener('online', refrescar);
      window.removeEventListener('offline', alPerderConexion);
      document.removeEventListener('visibilitychange', alVolver);
    };
  }, [uid, persona.id, refrescar, programarRefresco]);

  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(null), aviso.deshacer ? 7000 : 5000);
    return () => clearTimeout(t);
  }, [aviso]);

  // Aplica un cambio ya guardado en Supabase sin esperar a la recarga. Descarta
  // las recargas en curso, que traerían datos de antes del cambio.
  const aplicar = (cambio) => {
    ultimaPeticion.current++;
    setDatos((d) => (d ? { ...d, ...cambio(d) } : d));
    setConexion('ok');
  };

  // Ejecuta un cambio; si falla, avisa y lo relanza (el formulario sigue abierto).
  async function guardar(operacion) {
    try {
      // Sin red se avisa al momento (Supabase tardaría en rendirse).
      if (!navigator.onLine) throw new Error('Failed to fetch');
      await operacion();
    } catch (e) {
      avisar(mensajeDeError(e));
      refrescar();
      throw e;
    }
  }

  const acciones = {
    guardarDeseo: (deseo) =>
      guardar(async () => {
        if (deseo.id) {
          const nuevo = await actualizarDeseo(deseo.id, deseo);
          aplicar((d) => ({ deseos: d.deseos.map((x) => (x.id === nuevo.id ? nuevo : x)) }));
        } else {
          const nuevo = await crearDeseo(deseo);
          aplicar((d) => ({ deseos: [nuevo, ...d.deseos] }));
        }
      }),
    alternarComprado: (deseo) =>
      guardar(async () => {
        const nuevo = await actualizarDeseo(deseo.id, { comprado: !deseo.comprado });
        aplicar((d) => ({ deseos: d.deseos.map((x) => (x.id === nuevo.id ? nuevo : x)) }));
        if (nuevo.comprado) avisar(`«${nuevo.nombre}» pasa a comprados.`, () => acciones.alternarComprado(nuevo));
      }).catch(() => {}),
    // Lo confirma la hoja de edición; si falla, la hoja sigue abierta.
    borrarDeseo: (deseo) =>
      guardar(async () => {
        await borrarDeseo(deseo.id);
        aplicar((d) => ({
          deseos: d.deseos.filter((x) => x.id !== deseo.id),
          reservas: d.reservas.filter((r) => r.deseo_id !== deseo.id),
        }));
      }),
    reservar: (deseo) =>
      guardar(async () => {
        const reserva = await reservar(deseo.id);
        aplicar((d) => ({ reservas: [...d.reservas, reserva] }));
      }).catch(() => {}),
    anularReserva: (reserva) =>
      guardar(async () => {
        await anularReserva(reserva.id);
        aplicar((d) => ({ reservas: d.reservas.filter((r) => r.id !== reserva.id) }));
      }).catch(() => {}),
    editar: (deseo) => setForm(deseo),
  };

  // --- Pestañas (se cambian tocando o deslizando) --------------------------

  // El indicador de la pestaña activa sigue al dedo mientras se desliza.
  function moverIndicador() {
    const el = carril.current;
    pestanas.current?.style.setProperty('--progreso', el.scrollLeft / el.clientWidth);
  }

  useLayoutEffect(() => {
    const el = carril.current;
    if (!el) return;
    el.scrollLeft = indiceMio * el.clientWidth;
    moverIndicador();
  }, [indiceMio]);

  // La pestaña activa la decide alDeslizar según la posición del carril.
  function irA(i) {
    const el = carril.current;
    el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' });
  }

  function alDeslizar() {
    moverIndicador();
    const el = carril.current;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    if (i !== pestana && i >= 0 && i < PERSONAS.length) setPestana(i);
  }

  // --- Vista ---------------------------------------------------------------

  const miPerfilFalta =
    conexion === 'ok' && datos && !datos.perfiles.some((p) => p.id === uid);
  const otro = PERSONAS.find((p) => p.id !== persona.id);
  // Con la lista propia vacía, el botón de añadir ya está en el centro.
  const hayPendientesMios = datos?.deseos.some((d) => d.propietario === uid && !d.comprado);

  return (
    <div className="app">
      <header className="top">
        <Logo tamano={32} />
        <h1>Antojo</h1>
        <button
          className="icono-btn"
          aria-label="Opciones"
          aria-expanded={Boolean(menu)}
          onClick={() => setMenu((m) => (m ? null : 'abierto'))}
        >
          <Icono nombre="opciones" tamano={22} />
        </button>
        {menu && (
          <>
            <div className="menu-fondo" onClick={() => setMenu(null)} />
            <div className="menu-pop" role="menu">
              {menu === 'abierto' ? (
                <>
                  <p>
                    Has entrado como <b>{persona.nombre}</b>
                  </p>
                  <button role="menuitem" className="menu-item" onClick={() => setMenu('salir')}>
                    <Icono nombre="salir" tamano={18} />
                    Cerrar sesión o cambiar de usuario
                  </button>
                </>
              ) : (
                <>
                  <p>¿Cerrar sesión en este móvil? Tendrás que volver a escribir el PIN.</p>
                  <div className="acciones">
                    <button className="btn suave" onClick={() => setMenu(null)}>
                      Cancelar
                    </button>
                    <button className="btn peligro" onClick={onSalir}>
                      Cerrar sesión
                    </button>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </header>

      <nav className="pestanas" role="tablist" ref={pestanas} style={{ '--n': PERSONAS.length }}>
        {PERSONAS.map((p, i) => (
          <button
            key={p.id}
            role="tab"
            aria-selected={pestana === i}
            className={pestana === i ? 'on' : ''}
            onClick={() => irA(i)}
          >
            {p.nombre}
            {p.id === persona.id && <span className="yo">tú</span>}
          </button>
        ))}
      </nav>

      {conexion === 'sin-conexion' && (
        <div className="estado">
          {datos ? 'Sin conexión · mostrando la última copia guardada' : 'Sin conexión y aún no hay copia guardada'}
        </div>
      )}
      {miPerfilFalta && (
        <div className="estado error">
          Tu cuenta no figura como miembro de Antojo. Revisa que el email coincide con supabase/schema.sql.
        </div>
      )}

      <div className="carril" ref={carril} onScroll={alDeslizar}>
        {PERSONAS.map((p) => {
          const esMia = p.id === persona.id;
          return (
            <section key={p.id} className="panel" role="tabpanel" aria-label={`Lista de ${p.nombre}`}>
              {datos ? (
                <Lista
                  nombre={p.nombre}
                  otro={otro.nombre}
                  esMia={esMia}
                  deseos={datos.deseos.filter((d) => (d.propietario === uid) === esMia)}
                  reservas={esMia ? [] : datos.reservas}
                  acciones={acciones}
                  onAnadir={() => setForm({})}
                />
              ) : (
                conexion === 'cargando' && (
                  <div className="lista" aria-label="Cargando…">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="item fantasma" />
                    ))}
                  </div>
                )
              )}
            </section>
          );
        })}
      </div>

      {!form && pestana === indiceMio && hayPendientesMios && (
        <button className="fab" onClick={() => setForm({})}>
          <Icono nombre="mas" tamano={22} />
          Añadir
        </button>
      )}

      {form && (
        <FormDeseo
          inicial={form}
          onGuardar={acciones.guardarDeseo}
          onBorrar={acciones.borrarDeseo}
          onCerrar={() => setForm(null)}
        />
      )}

      {aviso && (
        <div className="aviso" role="status" onClick={() => setAviso(null)}>
          <span>{aviso.texto}</span>
          {aviso.deshacer && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setAviso(null);
                aviso.deshacer();
              }}
            >
              Deshacer
            </button>
          )}
        </div>
      )}
    </div>
  );
}
