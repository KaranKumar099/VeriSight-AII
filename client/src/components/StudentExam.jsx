import { AlertTriangle, Maximize2, Send, ShieldCheck, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { logEvent, startSession } from "../api";
import { questions } from "../data/questions";
import { MediaProctor } from "./MediaProctor";
import { useAuth } from "../context/AuthContext";

function elapsedSeconds(startedAt) {
  return Math.max(0, Math.round((Date.now() - startedAt) / 1000));
}

function WarningOverlay({ warning, warningCount, onDismiss, onReturnFullscreen }) {
  if (!warning) return null;

  return (
    <div className="fixed inset-x-0 top-4 z-50 mx-auto w-[calc(100%-2rem)] max-w-3xl">
      <div className="rounded-lg border border-red-400/40 bg-red-950/95 p-4 shadow-2xl shadow-red-950/40 backdrop-blur">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-red-300/30 bg-red-400/15 text-red-100">
            <AlertTriangle size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-base font-semibold text-white">{warning.title}</h2>
              <span className="text-xs font-medium text-red-100">Warning #{warningCount}</span>
            </div>
            <p className="mt-1 text-sm leading-6 text-red-100">{warning.message}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {warning.kind === "fullscreen" && (
                <button
                  type="button"
                  onClick={onReturnFullscreen}
                  className="inline-flex h-10 items-center gap-2 rounded-lg bg-red-100 px-3 text-sm font-semibold text-red-950 transition hover:bg-white"
                >
                  <Maximize2 size={16} />
                  Return to fullscreen
                </button>
              )}
              <button
                type="button"
                onClick={onDismiss}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-red-200/25 px-3 text-sm font-semibold text-red-50 transition hover:bg-white/10"
              >
                Acknowledge
              </button>
            </div>
          </div>
          <button
            type="button"
            title="Dismiss warning"
            onClick={onDismiss}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-red-200/20 text-red-100 transition hover:bg-white/10"
          >
            <X size={17} />
          </button>
        </div>
      </div>
    </div>
  );
}

export function StudentExam({ videoRef }) {
  const { user } = useAuth();
  const [identity, setIdentity] = useState({ userId: user?.id || "live-student", name: user?.name || "Live Student" });
  const [session, setSession] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [changes, setChanges] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [warning, setWarning] = useState(null);
  const [warningCount, setWarningCount] = useState(0);
  const [error, setError] = useState("");
  const [startedAt, setStartedAt] = useState(null);
  const [, setClockTick] = useState(0);

  const identityRef = useRef(identity);
  const sessionRef = useRef(session);
  const submittedRef = useRef(submitted);
  const questionStartedAtRef = useRef(Date.now());
  const lastActivityRef = useRef(Date.now());
  const idleLoggedAtRef = useRef(0);
  const submittedQuestionsRef = useRef(new Set());

  useEffect(() => {
    identityRef.current = identity;
  }, [identity]);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    submittedRef.current = submitted;
  }, [submitted]);

  const currentQuestion = questions[currentIndex];
  const progress = useMemo(() => Math.round(((currentIndex + 1) / questions.length) * 100), [currentIndex]);

  const showWarning = useCallback((kind, title, message) => {
    setWarning({
      id: `${kind}-${Date.now()}`,
      kind,
      title,
      message,
      timestamp: new Date().toISOString()
    });
    setWarningCount((count) => count + 1);
  }, []);

  const sendEvent = useCallback(async (eventType, metadata = {}) => {
    const activeSession = sessionRef.current;
    const activeIdentity = identityRef.current;
    if (!activeSession) return;

    try {
      await logEvent({
        userId: activeIdentity.userId,
        sessionId: activeSession.id,
        timestamp: new Date().toISOString(),
        eventType,
        metadata
      });
    } catch (eventError) {
      console.warn("Event log failed", eventError);
    }
  }, []);

  const requestExamFullscreen = useCallback(async () => {
    if (!document.documentElement.requestFullscreen) return;

    try {
      await document.documentElement.requestFullscreen();
      setWarning(null);
      await sendEvent("fullscreen_enter", {
        reason: "Student acknowledged warning and returned to fullscreen"
      });
    } catch {
      showWarning(
        "fullscreen",
        "Fullscreen is still off",
        "Please use the fullscreen button or browser prompt to continue the exam in monitored mode."
      );
    }
  }, [sendEvent, showWarning]);

  const recordQuestionSubmit = useCallback(async (question) => {
    if (!question || submittedQuestionsRef.current.has(question.id)) return;
    const answer = answers[question.id];
    submittedQuestionsRef.current.add(question.id);
    await sendEvent("question_submit", {
      questionId: question.id,
      answer: answer || null,
      timeSpentSec: elapsedSeconds(questionStartedAtRef.current),
      isCorrect: answer === question.correctAnswer,
      difficulty: question.difficulty,
      answerChanges: changes[question.id] || 0
    });
  }, [answers, changes, sendEvent]);

  async function handleStart(event) {
    event.preventDefault();
    setError("");
    try {
      const result = await startSession(identity);
      sessionRef.current = result.session;
      setSession(result.session);
      setSubmitted(false);
      setWarning(null);
      setWarningCount(0);
      setStartedAt(Date.now());
      questionStartedAtRef.current = Date.now();
      await logEvent({
        userId: identity.userId,
        sessionId: result.session.id,
        timestamp: new Date().toISOString(),
        eventType: "question_view",
        metadata: { questionId: questions[0].id, index: 0 }
      });

      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen()
          .then(() => logEvent({
            userId: identity.userId,
            sessionId: result.session.id,
            timestamp: new Date().toISOString(),
            eventType: "fullscreen_enter",
            metadata: { reason: "Exam started" }
          }))
          .catch(() => { });
      }
    } catch (startError) {
      setError(startError.message);
    }
  }

  function handleAnswer(answer) {
    const question = currentQuestion;
    const previousAnswer = answers[question.id] || null;
    const changeCount = (changes[question.id] || 0) + 1;
    setAnswers((current) => ({ ...current, [question.id]: answer }));
    setChanges((current) => ({ ...current, [question.id]: changeCount }));
    sendEvent("answer_change", {
      questionId: question.id,
      answer,
      previousAnswer,
      changeCount,
      timeSpentSec: elapsedSeconds(questionStartedAtRef.current),
      isCorrect: answer === question.correctAnswer,
      difficulty: question.difficulty
    });
  }

  async function handleNext() {
    await recordQuestionSubmit(currentQuestion);
    const nextIndex = currentIndex + 1;
    setCurrentIndex(nextIndex);
    questionStartedAtRef.current = Date.now();
    sendEvent("question_view", { questionId: questions[nextIndex].id, index: nextIndex });
  }

  async function handleSubmit() {
    await recordQuestionSubmit(currentQuestion);
    const correct = questions.filter((question) => answers[question.id] === question.correctAnswer).length;
    await sendEvent("exam_submit", {
      durationSec: startedAt ? elapsedSeconds(startedAt) : 0,
      answered: Object.keys(answers).length,
      totalQuestions: questions.length,
      accuracy: Math.round((correct / questions.length) * 100)
    });
    setSubmitted(true);
    setWarning(null);
  }

  useEffect(() => {
    if (!session) return undefined;
    let hiddenAt = null;
    const originalTitle = document.title;

    function markActivity(activityType) {
      lastActivityRef.current = Date.now();
      if (Date.now() - idleLoggedAtRef.current > 8000) {
        idleLoggedAtRef.current = Date.now();
        sendEvent("activity", { activityType, count: 1 });
      }
    }

    function handleVisibility() {
      if (document.hidden) {
        hiddenAt = Date.now();
        document.title = "Warning: Return to Exam";
        return;
      }
      document.title = originalTitle;
      if (hiddenAt) {
        const hiddenDurationSec = Math.round((Date.now() - hiddenAt) / 1000);
        showWarning(
          "tab",
          "Tab switch detected",
          `You left the exam window for ${hiddenDurationSec} second${hiddenDurationSec === 1 ? "" : "s"}. This action has been flagged for review.`
        );
        sendEvent("tab_switch", {
          hiddenDurationSec,
          reason: "Visibility API hidden state",
          warningDisplayed: true
        });
        hiddenAt = null;
      }
    }

    function handleFullscreen() {
      if (!document.fullscreenElement && !submittedRef.current) {
        showWarning(
          "fullscreen",
          "Fullscreen exit detected",
          "You exited fullscreen mode during the exam. Return to fullscreen now to avoid additional review flags."
        );
        sendEvent("fullscreen_exit", {
          reason: "Fullscreen change event",
          warningDisplayed: true
        });
      }
    }

    const idleTimer = setInterval(() => {
      const idleFor = Date.now() - lastActivityRef.current;
      if (idleFor >= 30000 && Date.now() - idleLoggedAtRef.current >= 30000) {
        idleLoggedAtRef.current = Date.now();
        sendEvent("idle", {
          durationSec: Math.round(idleFor / 1000),
          reason: "No mouse or keyboard activity"
        });
      }
    }, 5000);

    const keyListener = () => markActivity("keydown");
    const mouseListener = () => markActivity("mousemove");

    document.addEventListener("visibilitychange", handleVisibility);
    document.addEventListener("fullscreenchange", handleFullscreen);
    window.addEventListener("keydown", keyListener);
    window.addEventListener("mousemove", mouseListener);

    return () => {
      document.title = originalTitle;
      clearInterval(idleTimer);
      document.removeEventListener("visibilitychange", handleVisibility);
      document.removeEventListener("fullscreenchange", handleFullscreen);
      window.removeEventListener("keydown", keyListener);
      window.removeEventListener("mousemove", mouseListener);
    };
  }, [sendEvent, session, showWarning]);

  useEffect(() => {
    if (!session || submitted) return undefined;
    const timer = setInterval(() => setClockTick((value) => value + 1), 1000);
    return () => clearInterval(timer);
  }, [session, submitted]);

  // 🔒 BLOCK COPY / PASTE / CUT + RIGHT CLICK
useEffect(() => {
  function handleCopyPaste(e) {
    if (
      (e.ctrlKey || e.metaKey) &&
      (e.key === "c" || e.key === "v" || e.key === "x")
    ) {
      e.preventDefault();

      showWarning(
        "clipboard",
        "Copy/Paste blocked",
        "Copying or pasting is not allowed during the exam."
      );

      sendEvent("clipboard_blocked", {
        key: e.key,
      });
    }
  }

  function handleContextMenu(e) {
    e.preventDefault();

    showWarning(
      "clipboard",
      "Right click disabled",
      "Right-click is disabled during the exam."
    );

    sendEvent("right_click_blocked", {});
  }

  function handlePaste(e) {
    e.preventDefault();

    showWarning(
      "clipboard",
      "Paste blocked",
      "Pasting content is not allowed."
    );

    sendEvent("paste_blocked", {});
  }

  window.addEventListener("keydown", handleCopyPaste);
  window.addEventListener("contextmenu", handleContextMenu);
  window.addEventListener("paste", handlePaste);

  return () => {
    window.removeEventListener("keydown", handleCopyPaste);
    window.removeEventListener("contextmenu", handleContextMenu);
    window.removeEventListener("paste", handlePaste);
  };
}, []);

  if (!session) {
    return (
      <main className="p-4 lg:p-6">
        <section className="mx-auto max-w-2xl rounded-lg border border-white/10 bg-white/[0.045] p-5 shadow-glow">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-emerald-400/30 bg-emerald-400/10 text-emerald-200">
              <ShieldCheck size={22} />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Student Exam</h2>
              <p className="text-sm text-slate-400">Browser behavior is streamed to the risk engine</p>
            </div>
          </div>

          <form onSubmit={handleStart} className="space-y-4">
            <div className="rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2">
              <span className="block text-xs text-slate-400">Taking exam as</span>
              <span className="font-medium text-white">{identity.name} <span className="text-slate-400 text-sm">({identity.userId})</span></span>
            </div>
            {error && <p className="rounded-lg border border-red-400/20 bg-red-400/10 px-3 py-2 text-sm text-red-100">{error}</p>}
            <button
              type="submit"
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-emerald-400 px-4 font-semibold text-ink-950 transition hover:bg-emerald-300"
            >
              <Maximize2 size={18} />
              Start Exam
            </button>
          </form>
        </section>
      </main>
    );
  }

  if (submitted) {
    return (
      <main className="p-4 lg:p-6">
        <section className="mx-auto max-w-2xl rounded-lg border border-white/10 bg-white/[0.045] p-6 text-center">
          <h2 className="text-2xl font-semibold text-white">Exam Submitted</h2>
          <p className="mt-2 text-slate-400">Session data is available on the dashboard.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="p-4 lg:p-6">
      <WarningOverlay
        warning={warning}
        warningCount={warningCount}
        onDismiss={() => setWarning(null)}
        onReturnFullscreen={requestExamFullscreen}
      />
      <div className="mx-auto grid max-w-6xl gap-4 grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="rounded-lg border border-white/10 bg-white/[0.045] shadow-glow">
          <div className="border-b border-white/10 p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-mono text-sm text-slate-500">{identity.userId}</p>
                <h2 className="mt-1 text-xl font-semibold text-white">{identity.name}</h2>
              </div>
              <div className="text-sm text-slate-400">
                Question {currentIndex + 1} of {questions.length}
              </div>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-800">
              <div className="h-full rounded-full bg-emerald-400 transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>

          <div className="p-5">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="rounded-md border border-white/10 bg-white/[0.06] px-2 py-1 text-xs text-slate-300">
                {currentQuestion.difficulty}
              </span>
              <span className="rounded-md border border-white/10 bg-white/[0.06] px-2 py-1 text-xs text-slate-300">
                {elapsedSeconds(questionStartedAtRef.current)}s
              </span>
            </div>
            <h3 className="text-lg font-semibold text-white">{currentQuestion.prompt}</h3>

            <div className="mt-5">
              <textarea
                value={answers[currentQuestion.id] || ""}
                onChange={(e) => handleAnswer(e.target.value)}
                placeholder="Type your answer..."
                className="w-full min-h-[120px] rounded-lg border border-white/10 bg-white/[0.04] p-3 text-white outline-none focus:border-emerald-400/50"
              />
            </div>

            <div className="mt-6 flex justify-end">
              {currentIndex < questions.length - 1 ? (
                <button
                  type="button"
                  disabled={!answers[currentQuestion.id]}
                  onClick={handleNext}
                  className="inline-flex h-11 items-center gap-2 rounded-lg bg-emerald-400 px-4 font-semibold text-ink-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              ) : (
                <button
                  type="button"
                  disabled={!answers[currentQuestion.id]}
                  onClick={handleSubmit}
                  className="inline-flex h-11 items-center gap-2 rounded-lg bg-emerald-400 px-4 font-semibold text-ink-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Send size={18} />
                  Submit
                </button>
              )}
            </div>
          </div>
        </section>

        <MediaProctor
          session={session}
          submitted={submitted}
          sendEvent={sendEvent}
          onWarning={showWarning}
        />
      </div>
    </main>
  );
}
