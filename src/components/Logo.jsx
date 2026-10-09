import { useId } from 'react';

// Marca de Antojo: un regalo sobre el degradado de la app.
export default function Logo({ tamano = 40 }) {
  const degradado = useId();
  return (
    <svg className="logo" width={tamano} height={tamano} viewBox="0 0 48 48" aria-hidden="true">
      <defs>
        <linearGradient id={degradado} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--accent)" />
          <stop offset="1" stopColor="var(--accent-2)" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="14" fill={`url(#${degradado})`} />
      <g fill="none" stroke="var(--sobre-accent)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="12" y="19" width="24" height="6" rx="1.5" />
        <path d="M14 25v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-9M24 19v17" />
        <path d="M24 19c-2-5-8-5.5-8-2.2 0 1.8 3 2.2 8 2.2zm0 0c2-5 8-5.5 8-2.2 0 1.8-3 2.2-8 2.2z" />
      </g>
    </svg>
  );
}
