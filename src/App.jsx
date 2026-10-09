import { useEffect, useState } from 'react';
import {
  configurado,
  supabase,
  leerIdentidad,
  olvidarIdentidad,
  cerrarSesion,
  sesionPerdida,
} from './supabase.js';
import { borrarCopia } from './datos.js';
import { personaPorId } from './personas.js';
import Login from './components/Login.jsx';
import Principal from './components/Principal.jsx';
import Logo from './components/Logo.jsx';

export default function App() {
  const [identidad, setIdentidad] = useState(undefined); // undefined = comprobando

  useEffect(() => {
    if (!configurado) return;
    leerIdentidad().then(async (id) => {
      setIdentidad(id);
      // Se comprueba después de abrir para no esperar: sin conexión, Supabase
      // tarda en rendirse al refrescar el token. Si la sesión ya no existe,
      // hay que volver a entrar.
      if (id && (await sesionPerdida())) {
        await Promise.all([borrarCopia(), cerrarSesion()]);
        setIdentidad(null);
      }
    });
    // Sesión cerrada o revocada (también desde otro sitio): se olvida todo.
    const { data } = supabase.auth.onAuthStateChange((evento) => {
      if (evento === 'SIGNED_OUT') {
        borrarCopia();
        olvidarIdentidad();
        setIdentidad(null);
      }
    });
    return () => data.subscription.unsubscribe();
  }, []);

  async function salir() {
    await borrarCopia();
    await cerrarSesion();
    setIdentidad(null);
  }

  if (!configurado) {
    return (
      <div className="pantalla">
        <div className="marca">
          <Logo tamano={68} />
          <h1>4u4me</h1>
          <p className="sub">
            Falta configurar Supabase: copia <code>.env.example</code> a <code>.env</code>, rellena la URL y la
            clave anon, y vuelve a compilar.
          </p>
        </div>
      </div>
    );
  }

  if (identidad === undefined) return null;
  if (!identidad || !personaPorId(identidad.persona)) return <Login onEntrar={setIdentidad} />;

  return (
    <Principal
      key={identidad.uid}
      uid={identidad.uid}
      persona={personaPorId(identidad.persona)}
      onSalir={salir}
    />
  );
}
