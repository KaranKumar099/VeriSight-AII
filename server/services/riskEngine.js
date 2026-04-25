const RISK_LEVELS = {
  LOW: "Low Risk",
  MEDIUM: "Medium Risk",
  HIGH: "High Risk"
};

const EVENT_LABELS = {
  tab_switch: "Tab switch",
  fullscreen_exit: "Fullscreen exit",
  answer_change: "Answer changed",
  question_submit: "Question submitted",
  media_monitor_started: "Media monitor started",
  media_monitor_unsupported: "Media monitor unsupported",
  media_permission_denied: "Media permission denied",
  face_absent: "No person detected",
  multiple_faces: "Multiple people detected",
  high_noise: "High background noise",
  idle: "Idle period",
  activity: "Activity",
  exam_submit: "Exam submitted",
  session_start: "Exam started"
};

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function mean(values) {
  if (!values.length) return 0;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function std(values) {
  if (values.length < 2) return 0;
  const average = mean(values);
  const variance = mean(values.map((value) => (value - average) ** 2));
  return Math.sqrt(variance);
}

function percentile(values, p) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[clamp(index, 0, sorted.length - 1)];
}

function pushReason(reasons, code, label, severity, detail) {
  reasons.push({ code, label, severity, detail });
}

export function getEventLabel(eventType) {
  return EVENT_LABELS[eventType] || eventType.replaceAll("_", " ");
}

export function summarizeEvents(events) {
  const submissions = events.filter((event) => event.eventType === "question_submit");
  const answerSelections = events.filter((event) => event.eventType === "answer_change");
  const answerChanges = answerSelections.filter(
    (event) => Number(event.metadata?.changeCount || 0) > 1 || Boolean(event.metadata?.previousAnswer)
  );
  const idleEvents = events.filter((event) => event.eventType === "idle");
  const tabSwitches = events.filter((event) => event.eventType === "tab_switch");
  const fullscreenExits = events.filter((event) => event.eventType === "fullscreen_exit");
  const faceAbsentEvents = events.filter((event) => event.eventType === "face_absent");
  const multipleFaceEvents = events.filter((event) => event.eventType === "multiple_faces");
  const highNoiseEvents = events.filter((event) => event.eventType === "high_noise");
  const mediaPermissionDeniedEvents = events.filter((event) => event.eventType === "media_permission_denied");
  const mediaUnsupportedEvents = events.filter((event) => event.eventType === "media_monitor_unsupported");
  const responseTimes = submissions
    .map((event) => Number(event.metadata?.timeSpentSec))
    .filter(Number.isFinite);
  const correctSubmissions = submissions.filter((event) => event.metadata?.isCorrect);
  const questionChanges = new Map();

  for (const event of answerChanges) {
    const questionId = event.metadata?.questionId || "unknown";
    questionChanges.set(questionId, (questionChanges.get(questionId) || 0) + 1);
  }

  const repeatedQuestionChanges = [...questionChanges.values()].filter((count) => count >= 3).length;
  const idleSeconds = idleEvents.reduce(
    (total, event) => total + Number(event.metadata?.durationSec || 0),
    0
  );

  return {
    totalEvents: events.length,
    answersSubmitted: submissions.length,
    tabSwitches: tabSwitches.length,
    fullscreenExits: fullscreenExits.length,
    answerChanges: answerChanges.length,
    repeatedQuestionChanges,
    idleEvents: idleEvents.length,
    idleSeconds,
    faceAbsentEvents: faceAbsentEvents.length,
    multipleFaceEvents: multipleFaceEvents.length,
    highNoiseEvents: highNoiseEvents.length,
    mediaPermissionDeniedEvents: mediaPermissionDeniedEvents.length,
    mediaUnsupportedEvents: mediaUnsupportedEvents.length,
    mediaFlags: faceAbsentEvents.length + multipleFaceEvents.length + highNoiseEvents.length + mediaPermissionDeniedEvents.length,
    avgAnswerTimeSec: Math.round(mean(responseTimes)),
    p90AnswerTimeSec: Math.round(percentile(responseTimes, 90)),
    fastestAnswerSec: responseTimes.length ? Math.min(...responseTimes) : 0,
    slowestAnswerSec: responseTimes.length ? Math.max(...responseTimes) : 0,
    fastAnswers: responseTimes.filter((time) => time > 0 && time <= 8).length,
    slowAnswers: responseTimes.filter((time) => time >= 120).length,
    accuracy: submissions.length ? Math.round((correctSubmissions.length / submissions.length) * 100) : 0,
    hardFastCorrect: submissions.filter(
      (event) =>
        event.metadata?.difficulty === "hard" &&
        event.metadata?.isCorrect &&
        Number(event.metadata?.timeSpentSec || 999) <= 10
    ).length,
    submitted: events.some((event) => event.eventType === "exam_submit")
  };
}

function detectAccuracySpike(events) {
  const submissions = events
    .filter((event) => event.eventType === "question_submit")
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  if (submissions.length < 4) {
    return submissions.some(
      (event) =>
        event.metadata?.difficulty === "hard" &&
        event.metadata?.isCorrect &&
        Number(event.metadata?.timeSpentSec || 999) <= 10
    );
  }

  const midpoint = Math.floor(submissions.length / 2);
  const firstHalf = submissions.slice(0, midpoint);
  const secondHalf = submissions.slice(midpoint);
  const firstAccuracy = mean(firstHalf.map((event) => (event.metadata?.isCorrect ? 1 : 0)));
  const secondAccuracy = mean(secondHalf.map((event) => (event.metadata?.isCorrect ? 1 : 0)));
  const secondAvgTime = mean(secondHalf.map((event) => Number(event.metadata?.timeSpentSec || 0)));

  return firstAccuracy <= 0.45 && secondAccuracy >= 0.85 && secondAvgTime <= 18;
}

function scoreRules(metrics, events) {
  const reasons = [];
  const tabScore = clamp(metrics.tabSwitches * 8, 0, 32);
  if (metrics.tabSwitches >= 2) {
    pushReason(
      reasons,
      "TAB_SWITCHING",
      "Frequent tab switching",
      metrics.tabSwitches >= 4 ? "high" : "medium",
      `${metrics.tabSwitches} visibility changes detected`
    );
  }

  const fullscreenScore = clamp(metrics.fullscreenExits * 12, 0, 24);
  if (metrics.fullscreenExits > 0) {
    pushReason(
      reasons,
      "FULLSCREEN_EXIT",
      "Fullscreen exited",
      metrics.fullscreenExits > 1 ? "high" : "medium",
      `${metrics.fullscreenExits} fullscreen exit event${metrics.fullscreenExits === 1 ? "" : "s"}`
    );
  }

  const speedScore = clamp(metrics.fastAnswers * 7 + metrics.slowAnswers * 4, 0, 26);
  if (metrics.fastAnswers >= 2) {
    pushReason(
      reasons,
      "FAST_ANSWERS",
      "Abnormally fast answering",
      "high",
      `${metrics.fastAnswers} answers submitted in 8 seconds or less`
    );
  }
  if (metrics.slowAnswers >= 1) {
    pushReason(
      reasons,
      "SLOW_ANSWERS",
      "Unusually slow question time",
      "medium",
      `${metrics.slowAnswers} question${metrics.slowAnswers === 1 ? "" : "s"} took over 2 minutes`
    );
  }

  const changeScore = clamp(metrics.answerChanges * 2 + metrics.repeatedQuestionChanges * 7, 0, 24);
  if (metrics.answerChanges >= 4 || metrics.repeatedQuestionChanges > 0) {
    pushReason(
      reasons,
      "ANSWER_CHURN",
      "Repeated answer changes",
      metrics.answerChanges >= 6 ? "high" : "medium",
      `${metrics.answerChanges} answer change event${metrics.answerChanges === 1 ? "" : "s"}`
    );
  }

  const idleScore = clamp(Math.floor(metrics.idleSeconds / 20), 0, 18);
  if (metrics.idleSeconds >= 60) {
    pushReason(
      reasons,
      "IDLE_TIME",
      "Extended idle time",
      metrics.idleSeconds >= 120 ? "high" : "medium",
      `${Math.round(metrics.idleSeconds)} seconds with no activity`
    );
  }

  const accuracySpike = detectAccuracySpike(events);
  const spikeScore = accuracySpike ? 15 : 0;
  if (accuracySpike) {
    pushReason(
      reasons,
      "ACCURACY_SPIKE",
      "Sudden accuracy spike",
      "high",
      "Correct hard or late-stage answers arrived unusually quickly"
    );
  }

  const mediaAccessScore = clamp(metrics.mediaPermissionDeniedEvents * 18 + metrics.mediaUnsupportedEvents * 6, 0, 24);
  if (metrics.mediaPermissionDeniedEvents > 0) {
    pushReason(
      reasons,
      "MEDIA_BLOCKED",
      "Camera or microphone blocked",
      "high",
      "The student denied or lost required webcam/microphone access"
    );
  } else if (metrics.mediaUnsupportedEvents > 0) {
    pushReason(
      reasons,
      "MEDIA_UNSUPPORTED",
      "Face monitoring unavailable",
      "medium",
      "The browser could not run local person-count detection"
    );
  }

  const faceAbsentScore = clamp(metrics.faceAbsentEvents * 14, 0, 32);
  if (metrics.faceAbsentEvents > 0) {
    pushReason(
      reasons,
      "NO_PERSON",
      "No person detected",
      metrics.faceAbsentEvents >= 2 ? "high" : "medium",
      `${metrics.faceAbsentEvents} webcam check${metrics.faceAbsentEvents === 1 ? "" : "s"} found no visible person`
    );
  }

  const multipleFacesScore = clamp(metrics.multipleFaceEvents * 20, 0, 40);
  if (metrics.multipleFaceEvents > 0) {
    pushReason(
      reasons,
      "MULTIPLE_PEOPLE",
      "Multiple people detected",
      "high",
      `${metrics.multipleFaceEvents} webcam check${metrics.multipleFaceEvents === 1 ? "" : "s"} found more than one person`
    );
  }

  const noiseScore = clamp(metrics.highNoiseEvents * 8, 0, 24);
  if (metrics.highNoiseEvents > 0) {
    pushReason(
      reasons,
      "HIGH_NOISE",
      "High background noise",
      metrics.highNoiseEvents >= 3 ? "high" : "medium",
      `${metrics.highNoiseEvents} sustained microphone noise alert${metrics.highNoiseEvents === 1 ? "" : "s"}`
    );
  }

  return {
    score:
      tabScore +
      fullscreenScore +
      speedScore +
      changeScore +
      idleScore +
      spikeScore +
      mediaAccessScore +
      faceAbsentScore +
      multipleFacesScore +
      noiseScore,
    reasons
  };
}

function cohortAnomaly(metricsByUser) {
  const users = Object.keys(metricsByUser);
  const fields = [
    "tabSwitches",
    "fullscreenExits",
    "answerChanges",
    "idleSeconds",
    "fastAnswers",
    "slowAnswers",
    "faceAbsentEvents",
    "multipleFaceEvents",
    "highNoiseEvents",
    "mediaPermissionDeniedEvents"
  ];

  const baseline = {};
  for (const field of fields) {
    const values = users.map((userId) => Number(metricsByUser[userId][field] || 0));
    baseline[field] = { mean: mean(values), std: std(values) || 1 };
  }

  const result = {};
  for (const userId of users) {
    const factors = fields
      .map((field) => {
        const z = (Number(metricsByUser[userId][field] || 0) - baseline[field].mean) / baseline[field].std;
        return { field, z, value: metricsByUser[userId][field], mean: baseline[field].mean };
      })
      .filter((item) => item.z >= 1.15)
      .sort((a, b) => b.z - a.z);

    const avgZ = mean(factors.slice(0, 3).map((item) => item.z));
    result[userId] = {
      score: clamp(Math.round(avgZ * 18), 0, 28),
      factors: factors.slice(0, 3).map((item) => ({
        field: item.field,
        zScore: Number(item.z.toFixed(2)),
        value: item.value,
        cohortAverage: Number(item.mean.toFixed(2))
      }))
    };
  }

  return result;
}

export class RiskEngine {
  computeAll(users, events) {
    const eventsByUser = new Map(users.map((user) => [user.id, []]));
    for (const event of events) {
      if (!eventsByUser.has(event.userId)) eventsByUser.set(event.userId, []);
      eventsByUser.get(event.userId).push(event);
    }

    const metricsByUser = {};
    for (const user of users) {
      metricsByUser[user.id] = summarizeEvents(eventsByUser.get(user.id) || []);
    }

    const anomalyByUser = cohortAnomaly(metricsByUser);

    return users.map((user) => {
      const userEvents = eventsByUser.get(user.id) || [];
      const metrics = metricsByUser[user.id];
      const rules = scoreRules(metrics, userEvents);
      const anomaly = anomalyByUser[user.id] || { score: 0, factors: [] };
      const anomalyReasons = anomaly.score >= 15
        ? [
            {
              code: "COHORT_ANOMALY",
              label: "AI anomaly vs cohort",
              severity: anomaly.score >= 24 ? "high" : "medium",
              detail: "Behavior deviates from current exam cohort patterns"
            }
          ]
        : [];
      const score = clamp(Math.round(rules.score + anomaly.score));
      const level = score >= 70 ? RISK_LEVELS.HIGH : score >= 40 ? RISK_LEVELS.MEDIUM : RISK_LEVELS.LOW;

      return {
        userId: user.id,
        score,
        level,
        reasons: [...rules.reasons, ...anomalyReasons],
        metrics,
        anomaly,
        updatedAt: new Date().toISOString()
      };
    });
  }
}
