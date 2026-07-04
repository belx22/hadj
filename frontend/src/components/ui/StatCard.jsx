export default function StatCard({ label, value, accent = 'text-afriland-black', icon = null }) {
  return (
    <div className="card flex items-center justify-between gap-3">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-afriland-gray-600">{label}</p>
        <p className={`mt-1 text-2xl font-bold ${accent}`}>{value}</p>
      </div>
      {icon && <div className="text-afriland-red/80">{icon}</div>}
    </div>
  );
}
