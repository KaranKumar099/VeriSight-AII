import { ChevronRight } from "lucide-react";
import { RiskBadge } from "./RiskBadge";
import { RiskBar } from "./RiskBar";

function formatRelative(value) {
  if (!value) return "No events";
  const seconds = Math.max(1, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ago`;
}

export function ParticipantTable({ participants, selectedUserId, onSelect }) {
  return (
    <section className="overflow-hidden rounded-lg border border-white/10 bg-white/[0.045]">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <h2 className="text-base font-semibold text-white">Exam Participants</h2>
        <span className="text-sm text-slate-400">{participants.length} visible</span>
      </div>

      <div className="overflow-x-auto scrollbar-thin">
        <table className="min-w-[920px] w-full border-collapse text-left">
          <thead className="bg-white/[0.03] text-xs uppercase text-slate-400">
            <tr>
              <th className="px-4 py-3 font-medium">User ID</th>
              <th className="px-4 py-3 font-medium">Participant</th>
              <th className="px-4 py-3 font-medium">Risk Score</th>
              <th className="px-4 py-3 font-medium">Risk Level</th>
              <th className="px-4 py-3 font-medium">Flags / Reasons</th>
              <th className="px-4 py-3 font-medium">Last Event</th>
              <th className="w-12 px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-white/8">
            {participants.map((participant) => {
              const selected = selectedUserId === participant.userId;
              return (
                <tr
                  key={participant.userId}
                  onClick={() => onSelect(participant.userId)}
                  className={`cursor-pointer transition hover:bg-white/[0.06] ${
                    selected ? "bg-emerald-400/[0.08]" : ""
                  }`}
                >
                  <td className="px-4 py-4 font-mono text-sm text-slate-300">{participant.userId}</td>
                  <td className="px-4 py-4">
                    <div className="font-medium text-white">{participant.name}</div>
                    <div className="text-xs text-slate-500">{participant.status}</div>
                  </td>
                  <td className="px-4 py-4">
                    <RiskBar score={participant.riskScore} />
                  </td>
                  <td className="px-4 py-4">
                    <RiskBadge level={participant.riskLevel} />
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex max-w-md flex-wrap gap-2">
                      {participant.reasons?.length ? (
                        participant.reasons.slice(0, 3).map((reason) => (
                          <span
                            key={`${participant.userId}-${reason.code}`}
                            className="rounded-md border border-white/10 bg-white/[0.06] px-2 py-1 text-xs text-slate-200"
                          >
                            {reason.label}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-slate-500">No flags</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-400">{formatRelative(participant.lastEventAt)}</td>
                  <td className="px-4 py-4 text-slate-500">
                    <ChevronRight size={18} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
