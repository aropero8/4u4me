import { useState } from 'react';
import { PERSONAS } from '../personas.js';
import { iniciarSesion, esErrorDeRed } from '../supabase.js';
import Logo from './Logo.jsx';

// Pantalla "¿Quién eres?". Solo aparece la primera vez: luego la sesión se
// recuerda en el móvil.
export default function Login({ onEntrar }) {
  const [personaId, setPersonaId] = useState(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [entrando, setEntrando] = useState(false);

  const persona = PERSONAS.find((p) => p.id === personaId);

  async function entrar(e) {
    e.preventDefault();
    if (!persona || !pin) return;
    setEntrando(true);
    setError('');
    try {
      onEntrar(await iniciarSesion(persona, pin));
    } catch (err) {
      if (esErrorDeRed(err)) setError('Sin conexión. Para entrar la primera vez hace falta internet.');
      else if (err?.code === 'invalid_credentials' || err?.status === 400) setError('PIN incorrecto.');
      else setError(`No se pudo entrar: ${err?.message ?? err}`);
      setEntrando(false);
    }
  }

  return (
    <div className="pantalla">
      <div className="marca">
        <Logo tamano={68} />
        <h1>Antojo</h1>
        <p className="sub">Vuestra lista de deseos, con los regalos en secreto.</p>
      </div>
      <form className="login" onSubmit={entrar}>
        <h2>¿Quién eres?</h2>
        <div className="quien">
          {PERSONAS.map((p) => (
            <button
              key={p.id}
              type="button"
              className={`persona ${personaId === p.id ? 'on' : ''}`}
              aria-pressed={personaId === p.id}
              onClick={() => {
                setPersonaId(p.id);
                setError('');
              }}
            >
              {p.nombre}
            </button>
          ))}
        </div>
        {persona && (
          <label>
            PIN de {persona.nombre}
            <input
              className="pin"
              autoFocus
              type="password"
              inputMode="numeric"
              autoComplete="current-password"
              enterKeyHint="go"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
            />
          </label>
        )}
        {error && <p className="error">{error}</p>}
        <button type="submit" className="btn" disabled={!persona || !pin || entrando}>
          {entrando ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}
