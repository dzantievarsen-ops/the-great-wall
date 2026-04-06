interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
}

export function StatCard({ label, value, sub, accent }: StatCardProps) {
  return (
    <div className="glass-static rounded-xl p-5">
      <p className="text-xs font-medium uppercase tracking-wider text-slate-500 mb-1.5">{label}</p>
      <p className={`text-2xl font-bold tabular-nums ${accent ? 'text-wall-400' : 'text-slate-100'}`}>
        {value}
      </p>
      {sub && (
        <p className="text-xs text-slate-500 mt-1">{sub}</p>
      )}
    </div>
  );
}
