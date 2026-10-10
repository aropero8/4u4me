import { useId } from 'react';

// Marca de 4u4me: un regalo sobre el degradado de la app.
// Es el mismo dibujo que el icono de Android (res/drawable/ic_launcher_foreground.xml),
// en su lienzo de 108 recortado a los 90 centrales.
export default function Logo({ tamano = 40 }) {
  const degradado = useId();
  return (
    <svg className="logo" width={tamano} height={tamano} viewBox="9 9 90 90" aria-hidden="true">
      <defs>
        <linearGradient id={degradado} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--accent)" />
          <stop offset="1" stopColor="var(--accent-2)" />
        </linearGradient>
      </defs>
      <rect x="9" y="9" width="90" height="90" rx="26" fill={`url(#${degradado})`} />
      <g transform="translate(54 54) scale(1.1) translate(-54 -54)" fill="var(--sobre-accent)">
        <g fill="none" stroke="var(--sobre-accent)" strokeWidth="4.5" strokeLinejoin="round">
          <path d="M54 42.5C49 42.5 40 41.5 40 36.8 40 33.2 45 32.6 48.6 35.6 51.2 37.8 53 40 54 42.5Z" />
          <path d="M54 42.5C59 42.5 68 41.5 68 36.8 68 33.2 63 32.6 59.4 35.6 56.8 37.8 55 40 54 42.5Z" />
        </g>
        <rect x="33" y="45" width="18" height="11" rx="3" />
        <rect x="57" y="45" width="18" height="11" rx="3" />
        <path d="M36 59H51V77H39A3 3 0 0 1 36 74Z" />
        <path d="M57 59H72V74A3 3 0 0 1 69 77H57Z" />
      </g>
    </svg>
  );
}
