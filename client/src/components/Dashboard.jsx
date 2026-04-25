import { Activity, AlertTriangle, Gauge, Users } from "lucide-react";
import { ParticipantTable } from "./ParticipantTable";
import { StatCard } from "./StatCard";
import { TimelinePanel } from "./TimelinePanel";

function topAnomalyFactors(participants) {
  const factors = new Map();
  for (const participant of participants) {
    for (const factor of participant.anomaly?.factors || []) {
      const current = factors.get(factor.field) || { field: factor.field, count: 0, maxZ: 0 };
      current.count += 1;
      current.maxZ = Math.max(current.maxZ, factor.zScore);
      factors.set(factor.field, current);
    }
  }
  return [...factors.values()].sort((a, b) => b.maxZ - a.maxZ).slice(0, 5);
}

function AnalyticsStrip({ participants }) {
  const factors = topAnomalyFactors(participants);
  const high = participants.filter((participant) => participant.riskLevel === "High Risk");

  return (
    <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
      <div className="rounded-lg border border-white/10 bg-white/[0.045] p-4">
        <h2 className="text-base font-semibold text-white">Anomaly Drivers</h2>
        <div className="mt-4 space-y-3">
          {factors.length ? (
            factors.map((factor) => (
              <div key={factor.field}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="capitalize text-slate-300">{factor.field.replace(/([A-Z])/g, " $1")}</span>
                  <span className="font-mono text-slate-400">z {factor.maxZ.toFixed(2)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-cyan-300"
                    style={{ width: `${Math.min(100, factor.maxZ * 24)}%` }}
                  />
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-500">No anomaly drivers detected</p>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-white/10 bg-white/[0.045] p-4">
        <h2 className="text-base font-semibold text-white">High Risk Reasons</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {high.flatMap((participant) => participant.reasons || []).length ? (
            high.flatMap((participant) => participant.reasons || []).slice(0, 12).map((reason, index) => (
              <span
                key={`${reason.code}-${index}`}
                className="rounded-md border border-red-400/20 bg-red-400/10 px-2 py-1 text-xs text-red-100"
              >
                {reason.label}
              </span>
            ))
          ) : (
            <p className="text-sm text-slate-500">No high risk flags</p>
          )}
        </div>
      </div>
    </section>
  );
}

export function Dashboard({ analytics, participants, selectedUserId, onSelectUser, view }) {
  const summary = analytics?.summary || {};
  const visibleParticipants = view === "alerts"
    ? participants.filter((participant) => participant.riskLevel !== "Low Risk")
    : participants;

  return (
    <main className="space-y-4 p-4 lg:p-6">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Users} label="Participants" value={summary.totalParticipants || 0} tone="cyan" />
        <StatCard icon={AlertTriangle} label="High Risk" value={summary.highRisk || 0} tone="red" />
        <StatCard icon={Gauge} label="Average Risk" value={summary.averageRisk || 0} tone="amber" />
        <StatCard icon={Activity} label="Events / Min" value={summary.eventsLastMinute || 0} tone="emerald" />
      </section>

      {view === "analytics" && <AnalyticsStrip participants={participants} />}

      <section className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_440px]">
        <ParticipantTable
          participants={visibleParticipants}
          selectedUserId={selectedUserId}
          onSelect={onSelectUser}
        />
        <TimelinePanel userId={selectedUserId} onClose={() => onSelectUser(null)} />
      </section>
    </main>
  );
}
