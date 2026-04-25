function barColor(score) {
  if (score >= 70) return "bg-red-400";
  if (score >= 40) return "bg-amber-400";
  return "bg-emerald-400";
}

export function RiskBar({ score = 0 }) {
  return (
    <div className="flex min-w-40 items-center gap-3">
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-800">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor(score)}`}
          style={{ width: `${Math.max(0, Math.min(100, score))}%` }}
        />
      </div>
      <span className="w-10 text-right text-sm font-semibold text-slate-100">{score}</span>
    </div>
  );
}
