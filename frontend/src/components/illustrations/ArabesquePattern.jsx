/**
 * Motif géométrique arabe (arabesque) en filigrane, généré en SVG pur.
 * Utilisé comme arrière-plan discret (opacité faible) — aucune image externe,
 * aucun élément figuratif : uniquement des tracés géométriques respectueux.
 */
export default function ArabesquePattern({ className = '', tone = '#C8102E', opacity = 0.06 }) {
  const patternId = 'arabesque-pattern';
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      width="100%"
      height="100%"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <pattern id={patternId} width="80" height="80" patternUnits="userSpaceOnUse">
          <g fill="none" stroke={tone} strokeOpacity={opacity} strokeWidth="1">
            <path d="M40 0 L80 40 L40 80 L0 40 Z" />
            <circle cx="40" cy="40" r="28" />
            <path d="M40 12 L68 40 L40 68 L12 40 Z" />
            <path d="M0 0 L80 80 M80 0 L0 80" />
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${patternId})`} />
    </svg>
  );
}
