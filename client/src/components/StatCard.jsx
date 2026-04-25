export function StatCard({ icon: Icon, label, value, tone = "emerald" }) {
  const toneClass = {
    emerald: "border-emerald-400/20 bg-emerald-400/10 text-emerald-200",
    amber: "border-amber-400/20 bg-amber-400/10 text-amber-200",
    red: "border-red-400/20 bg-red-400/10 text-red-200",
    cyan: "border-cyan-400/20 bg-cyan-400/10 text-cyan-200"
  }[tone];

  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.045] p-4 shadow-glow">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase text-slate-400">{label}</p>
          <p className="mt-2 text-3xl font-semibold text-white">{value}</p>
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-lg border ${toneClass}`}>
          <Icon size={22} />
        </div>
      </div>
    </section>
  );
}
