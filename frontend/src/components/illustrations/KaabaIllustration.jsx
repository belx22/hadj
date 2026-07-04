/**
 * Illustration vectorielle stylisée et sobre évoquant le lieu saint de la Kaaba.
 * Représentation géométrique volontairement abstraite (cube + bande ornementale
 * + croissant), sans photographie ni détail figuratif précis, dans un souci de
 * sobriété et de respect du caractère religieux du sujet.
 */
export default function KaabaIllustration({ className = '' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 320 320"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Illustration stylisée évoquant le pèlerinage"
    >
      <defs>
        <linearGradient id="skyGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#111111" stopOpacity="0.04" />
          <stop offset="100%" stopColor="#C8102E" stopOpacity="0.08" />
        </linearGradient>
      </defs>

      <rect x="0" y="0" width="320" height="320" fill="url(#skyGradient)" rx="16" />

      {/* Croissant */}
      <path
        d="M232 46c10 4 16 14 16 25 0 15-12 27-27 27-6 0-11-2-16-5 8 10 20 16 34 16 24 0 43-19 43-43 0-19-12-35-29-41-8-2-16-1-21 21z"
        fill="#C8102E"
        opacity="0.85"
      />

      {/* Sol */}
      <rect x="20" y="248" width="280" height="6" fill="#9CA3AF" opacity="0.5" />

      {/* Cube central (structure sobre à géométrie simple) */}
      <g>
        <rect x="95" y="120" width="130" height="128" fill="#111111" />
        {/* Bande ornementale horizontale, sobre, sans motif figuratif */}
        <rect x="95" y="164" width="130" height="16" fill="#C8102E" />
        <g stroke="#F5F5F5" strokeOpacity="0.35" strokeWidth="1.5">
          <path d="M95 172 L225 172" />
        </g>
        {/* Reliefs géométriques discrets sur la bande */}
        <g fill="#F5F5F5" opacity="0.25">
          <rect x="110" y="168" width="8" height="8" />
          <rect x="140" y="168" width="8" height="8" />
          <rect x="170" y="168" width="8" height="8" />
          <rect x="200" y="168" width="8" height="8" />
        </g>
        {/* Porte stylisée */}
        <rect x="148" y="200" width="24" height="48" fill="#C8102E" opacity="0.9" />
      </g>

      {/* Arches latérales sobres évoquant l'architecture environnante */}
      <g fill="none" stroke="#595959" strokeOpacity="0.35" strokeWidth="2">
        <path d="M40 248 v-40 a20 20 0 0 1 40 0 v40" />
        <path d="M240 248 v-40 a20 20 0 0 1 40 0 v40" />
      </g>
    </svg>
  );
}
