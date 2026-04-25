import { AlertTriangle, Brain, Clock, X } from "lucide-react";
import { useEffect, useState } from "react";
import { fetchParticipant } from "../api";
import { RiskBadge } from "./RiskBadge";
import { RiskBar } from "./RiskBar";

function formatTime(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(new Date(value));
}

function eventTone(eventType) {
  if (["tab_switch", "fullscreen_exit", "face_absent", "multiple_faces", "media_permission_denied"].includes(eventType)) return "border-red-400/30 bg-red-400/10 text-red-200";
  if (["answer_change", "idle", "high_noise", "media_monitor_unsupported"].includes(eventType)) return "border-amber-400/30 bg-amber-400/10 text-amber-200";
  return "border-emerald-400/20 bg-emerald-400/10 text-emerald-200";
}

export function TimelinePanel({ userId, onClose }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetchParticipant(userId)
      .then((result) => {
        if (!cancelled) setDetail(result);
      })
      .catch(() => {
        if (!cancelled) setDetail(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    const timer = setInterval(() => {
      fetchParticipant(userId)
        .then((result) => {
          if (!cancelled) setDetail(result);
        })
        .catch(() => {});
    }, 5000);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [userId]);

  if (!userId) {
    return (
      <aside className="rounded-lg border border-white/10 bg-white/[0.045] p-5">
        <p className="text-sm text-slate-400">No participant selected</p>
      </aside>
    );
  }

  const participant = detail?.participant;
  const metrics = participant?.metrics || {};

  return (
    <aside className="rounded-lg border border-white/10 bg-white/[0.045]">
      <div className="flex items-start justify-between gap-3 border-b border-white/10 p-4">
        <div>
          <p className="font-mono text-xs text-slate-500">{participant?.userId || userId}</p>
          <h2 className="mt-1 text-lg font-semibold text-white">{participant?.name || "Loading"}</h2>
        </div>
        <button
          type="button"
          title="Close details"
          onClick={onClose}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-slate-400 transition hover:text-white"
        >
          <X size={17} />
        </button>
      </div>

      {loading && !detail ? (
        <div className="p-5 text-sm text-slate-400">Loading participant details</div>
      ) : (
        <div className="space-y-5 p-4">
          {participant && (
            <>
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <RiskBadge level={participant.riskLevel} />
                  <RiskBar score={participant.riskScore} />
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
                    <p className="text-slate-500">Tab switches</p>
                    <p className="mt-1 text-xl font-semibold text-white">{metrics.tabSwitches || 0}</p>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
                    <p className="text-slate-500">Answer changes</p>
                    <p className="mt-1 text-xl font-semibold text-white">{metrics.answerChanges || 0}</p>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
                    <p className="text-slate-500">Idle seconds</p>
                    <p className="mt-1 text-xl font-semibold text-white">{metrics.idleSeconds || 0}</p>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
                    <p className="text-slate-500">Accuracy</p>
                    <p className="mt-1 text-xl font-semibold text-white">{metrics.accuracy || 0}%</p>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
                    <p className="text-slate-500">Media flags</p>
                    <p className="mt-1 text-xl font-semibold text-white">{metrics.mediaFlags || 0}</p>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
                    <p className="text-slate-500">Noise alerts</p>
                    <p className="mt-1 text-xl font-semibold text-white">{metrics.highNoiseEvents || 0}</p>
                  </div>
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-white">
                  <AlertTriangle size={16} className="text-amber-300" />
                  Flags
                </div>
                <div className="flex flex-wrap gap-2">
                  {participant.reasons?.length ? (
                    participant.reasons.map((reason) => (
                      <span
                        key={reason.code}
                        className="rounded-md border border-white/10 bg-white/[0.06] px-2 py-1 text-xs text-slate-200"
                        title={reason.detail}
                      >
                        {reason.label}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-slate-500">No flags</span>
                  )}
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-white">
                  <Brain size={16} className="text-cyan-300" />
                  Cohort Anomaly
                </div>
                <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">Model score</span>
                    <span className="font-semibold text-white">{participant.anomaly?.score || 0}</span>
                  </div>
                  <div className="mt-3 space-y-2">
                    {participant.anomaly?.factors?.length ? (
                      participant.anomaly.factors.map((factor) => (
                        <div key={factor.field} className="flex items-center justify-between gap-3 text-xs">
                          <span className="capitalize text-slate-400">{factor.field.replace(/([A-Z])/g, " $1")}</span>
                          <span className="font-mono text-slate-200">z {factor.zScore}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-slate-500">Within cohort baseline</p>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          <div>
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
              <Clock size={16} className="text-emerald-300" />
              Behavior Timeline
            </div>
            <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1 scrollbar-thin">
              {detail?.timeline?.map((event) => (
                <div key={event.id} className="rounded-lg border border-white/10 bg-white/[0.035] p-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className={`rounded-md border px-2 py-1 text-xs font-medium ${eventTone(event.eventType)}`}>
                      {event.label}
                    </span>
                    <span className="text-xs text-slate-500">{formatTime(event.timestamp)}</span>
                  </div>
                  {Object.keys(event.metadata || {}).length > 0 && (
                    <pre className="mt-2 max-h-24 overflow-auto whitespace-pre-wrap rounded-md bg-black/20 p-2 text-xs text-slate-400 scrollbar-thin">
                      {JSON.stringify(event.metadata, null, 2)}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
