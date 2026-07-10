export default function StatCard({ label, value, accent = 'text-afriland-black', icon = null }) {
  return (
    <div className="card flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-afriland-gray-600">{label}</p>
        {/* Les montants (« 3 500 000 FCFA ») débordent en grille 2 colonnes sur
            mobile : on réduit la taille et on autorise le retour à la ligne. */}
        <p className={`mt-1 break-words text-lg font-bold sm:text-2xl ${accent}`}>{value}</p>
      </div>
      {icon && <div className="shrink-0 text-afriland-red/80">{icon}</div>}
    </div>
  );
}
