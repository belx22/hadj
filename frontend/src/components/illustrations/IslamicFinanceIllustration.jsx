/**
 * Illustration vectorielle stylisée évoquant la finance islamique : une arche
 * (mihrab) inscrivant des piles de pièces croissantes (prospérité licite et
 * partagée), surmontées d'un croissant et d'une étoile, avec des motifs
 * géométriques discrets. Représentation sobre et abstraite, dans la palette
 * Afriland, pensée pour s'afficher sur le panneau sombre des écrans de
 * connexion et d'inscription.
 */
export default function IslamicFinanceIllustration({ className = '' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 320 320"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Illustration stylisée évoquant la finance islamique"
    >
      <defs>
        <linearGradient id="ifGlow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#C8102E" stopOpacity="0.14" />
          <stop offset="100%" stopColor="#111111" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="ifCoin" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F5F5F5" />
          <stop offset="100%" stopColor="#D1D5DB" />
        </linearGradient>
      </defs>

      <rect x="0" y="0" width="320" height="320" fill="url(#ifGlow)" rx="16" />

      {/* Arche en ogive (mihrab) encadrant la scène */}
      <path
        d="M78 250 V150 a82 82 0 0 1 164 0 V250"
        fill="none"
        stroke="#F5F5F5"
        strokeOpacity="0.28"
        strokeWidth="3"
      />
      <path
        d="M96 250 V150 a64 64 0 0 1 128 0 V250"
        fill="none"
        stroke="#C8102E"
        strokeOpacity="0.55"
        strokeWidth="2"
      />

      {/* Croissant + étoile au sommet de l'arche */}
      <g transform="translate(160 60)">
        <path
          d="M6 -20c-10 3 -17 12 -17 24 0 13 9 23 22 24 -4 2 -9 3 -14 3 -16 0 -29 -13 -29 -29s13 -29 29 -29c3 0 6 1 9 2z"
          fill="#C8102E"
          opacity="0.9"
        />
        <path
          d="M24 -6 l3 8 8 0 -6 6 2 8 -7 -4 -7 4 2 -8 -6 -6 8 0z"
          fill="#F5F5F5"
          opacity="0.85"
        />
      </g>

      {/* Sol */}
      <rect x="70" y="248" width="180" height="5" rx="2.5" fill="#9CA3AF" opacity="0.5" />

      {/* Trois piles de pièces croissantes (prospérité partagée) */}
      <CoinStack x="112" baseY="242" count="3" />
      <CoinStack x="160" baseY="242" count="5" />
      <CoinStack x="208" baseY="242" count="4" />

      {/* Motifs géométriques discrets (étoiles à huit branches) */}
      <g fill="#F5F5F5" opacity="0.12">
        <EightPointStar cx="60" cy="120" r="10" />
        <EightPointStar cx="260" cy="120" r="10" />
        <EightPointStar cx="44" cy="210" r="7" />
        <EightPointStar cx="276" cy="210" r="7" />
      </g>
    </svg>
  );
}

/** Pile de pièces empilées, chacune stylisée par une ellipse et une fente. */
function CoinStack({ x, baseY, count }) {
  const n = Number(count);
  const cx = Number(x);
  const by = Number(baseY);
  const coinH = 12;
  const rx = 20;
  const ry = 6;

  return (
    <g>
      {Array.from({ length: n }).map((_, i) => {
        const cy = by - i * coinH;
        return (
          <g key={i}>
            {/* Corps de la pièce */}
            <rect x={cx - rx} y={cy - ry} width={rx * 2} height={coinH} fill="url(#ifCoin)" />
            {/* Tranche inférieure */}
            <ellipse cx={cx} cy={cy - ry + coinH} rx={rx} ry={ry} fill="#9CA3AF" />
            {/* Dessus de la pièce */}
            <ellipse cx={cx} cy={cy - ry} rx={rx} ry={ry} fill="url(#ifCoin)" stroke="#C8102E" strokeOpacity="0.55" strokeWidth="1.2" />
            {/* Fente centrale (croissant symbolique) */}
            <path d={`M${cx - 6} ${cy - ry} a6 3 0 0 0 12 0`} fill="none" stroke="#C8102E" strokeOpacity="0.6" strokeWidth="1.4" />
          </g>
        );
      })}
    </g>
  );
}

/** Petite étoile à huit branches, motif géométrique islamique classique. */
function EightPointStar({ cx, cy, r }) {
  const points = [];
  for (let i = 0; i < 16; i += 1) {
    const radius = i % 2 === 0 ? r : r * 0.42;
    const angle = (Math.PI / 8) * i - Math.PI / 2;
    points.push(`${(cx + radius * Math.cos(angle)).toFixed(1)},${(cy + radius * Math.sin(angle)).toFixed(1)}`);
  }
  return <polygon points={points.join(' ')} />;
}
