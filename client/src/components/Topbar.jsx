import { Pause, Play, RotateCcw, Search, SlidersHorizontal } from "lucide-react";

export function Topbar({
  search,
  onSearchChange,
  riskFilter,
  onRiskFilterChange,
  simulator,
  onStartSimulator,
  onStopSimulator,
  onResetSimulator
}) {
  return (
    <header className="flex flex-col gap-3 border-b border-white/10 bg-ink-900/70 px-4 py-4 backdrop-blur lg:px-6">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="text-xs font-medium uppercase text-emerald-300">Online Exam Monitoring</p>
          <h1 className="mt-1 text-2xl font-semibold text-white">Risk Intelligence Dashboard</h1>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="relative block min-w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search participants"
              className="h-11 w-full rounded-lg border border-white/10 bg-white/[0.05] pl-10 pr-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-400/10"
            />
          </label>

          <label className="relative block min-w-44">
            <SlidersHorizontal className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <select
              value={riskFilter}
              onChange={(event) => onRiskFilterChange(event.target.value)}
              className="h-11 w-full appearance-none rounded-lg border border-white/10 bg-white/[0.05] pl-10 pr-3 text-sm text-white outline-none transition focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-400/10"
            >
              <option value="All">All risk levels</option>
              <option value="High Risk">High Risk</option>
              <option value="Medium Risk">Medium Risk</option>
              <option value="Low Risk">Low Risk</option>
            </select>
          </label>

          <div className="flex items-center gap-2">
            <button
              type="button"
              title={simulator?.running ? "Stop simulator" : "Start simulator"}
              onClick={simulator?.running ? onStopSimulator : onStartSimulator}
              className="flex h-11 w-11 items-center justify-center rounded-lg border border-white/10 bg-white/[0.05] text-slate-200 transition hover:border-emerald-400/40 hover:text-emerald-200"
            >
              {simulator?.running ? <Pause size={18} /> : <Play size={18} />}
            </button>
            <button
              type="button"
              title="Reset demo data"
              onClick={onResetSimulator}
              className="flex h-11 w-11 items-center justify-center rounded-lg border border-white/10 bg-white/[0.05] text-slate-200 transition hover:border-emerald-400/40 hover:text-emerald-200"
            >
              <RotateCcw size={18} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
