/**
 * Silhouette sobre d'arches et de coupoles (architecture islamique générique),
 * utilisée en bandeau décoratif. Dessin géométrique, aucune représentation
 * d'un lieu ou monument réel précis.
 */
export default function DomeArchIllustration({ className = '' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 600 140"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Silhouette d'arches et de coupoles"
      preserveAspectRatio="xMidYMax slice"
    >
      <g fill="#111111" opacity="0.9">
        <path d="M0 140 V90 h40 v-10 a20 20 0 0 1 40 0 v10 h40 V140 Z" />
        <path d="M140 140 V70 h50 v-14 a25 25 0 0 1 50 0 v14 h50 V140 Z" />
        <circle cx="290" cy="45" r="10" fill="#C8102E" />
        <path d="M260 140 V95 h30 v-8 a15 15 0 0 1 30 0 v8 h30 V140 Z" />
        <path d="M360 140 V60 h55 v-16 a27.5 27.5 0 0 1 55 0 v16 h55 V140 Z" />
        <path d="M520 140 V90 h40 v-10 a20 20 0 0 1 40 0 v10 h40 V140 Z" />
      </g>
      <rect x="0" y="136" width="600" height="4" fill="#C8102E" opacity="0.7" />
    </svg>
  );
}
