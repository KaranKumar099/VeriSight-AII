import { Activity, BarChart3, Bell, GraduationCap, LayoutDashboard, ShieldCheck } from "lucide-react";

const items = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "alerts", label: "Alerts", icon: Bell },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "student", label: "Student Demo", icon: GraduationCap }
];

export function Sidebar({ view, onViewChange }) {
  return (
    <aside className="flex w-full flex-row items-center justify-between border-b border-white/10 bg-ink-950/80 px-4 py-3 backdrop-blur lg:h-screen lg:w-72 lg:flex-col lg:items-stretch lg:border-b-0 lg:border-r lg:px-5 lg:py-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-emerald-400/30 bg-emerald-400/10 text-emerald-200">
          <ShieldCheck size={22} />
        </div>
        <div className="hidden min-w-0 sm:block">
          <p className="truncate text-sm font-semibold text-white">SentinelExam</p>
          <p className="truncate text-xs text-slate-400">Risk command center</p>
        </div>
      </div>

      <nav className="flex items-center gap-1 overflow-x-auto lg:mt-8 lg:flex-col lg:items-stretch lg:gap-2">
        {items.map((item) => {
          const Icon = item.icon;
          const active = view === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onViewChange(item.id)}
              className={`flex h-10 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-medium transition ${
                active
                  ? "bg-emerald-400/12 text-emerald-100 ring-1 ring-emerald-400/25"
                  : "text-slate-400 hover:bg-white/5 hover:text-slate-100"
              }`}
            >
              <Icon size={18} />
              <span className="hidden md:inline">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="hidden rounded-lg border border-white/10 bg-white/[0.04] p-3 lg:block">
        <div className="flex items-center gap-2 text-sm text-slate-200">
          <Activity size={16} className="text-emerald-300" />
          Live scoring
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-800">
          <div className="h-full w-2/3 rounded-full bg-emerald-400" />
        </div>
      </div>
    </aside>
  );
}
