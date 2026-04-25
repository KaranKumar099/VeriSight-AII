import { demoQuestions, demoUsers } from "../data/questions.js";

const PROFILES = {
  "stu-001": "normal",
  "stu-002": "tab_switcher",
  "stu-003": "answer_changer",
  "stu-004": "idle_slow",
  "stu-005": "normal",
  "stu-006": "mixed"
};

function randomItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function choice(probability) {
  return Math.random() < probability;
}

function makeSubmission(userId, state, speed = "normal") {
  const question = demoQuestions[state.questionIndex % demoQuestions.length];
  const correct = speed === "fast" || choice(0.72);
  const answer = correct ? question.correctAnswer : randomItem(question.options.filter((option) => option !== question.correctAnswer));
  const answerChanges = state.answerChanges;
  const timeSpentSec = speed === "fast"
    ? Math.floor(4 + Math.random() * 5)
    : speed === "slow"
      ? Math.floor(122 + Math.random() * 70)
      : Math.floor(26 + Math.random() * 55);

  state.questionIndex += 1;
  state.answerChanges = 0;

  return {
    userId,
    timestamp: new Date().toISOString(),
    eventType: "question_submit",
    metadata: {
      questionId: question.id,
      answer,
      timeSpentSec,
      isCorrect: answer === question.correctAnswer,
      difficulty: question.difficulty,
      answerChanges
    }
  };
}

function makeAnswerChange(userId, state, forceCorrect = false) {
  const question = demoQuestions[state.questionIndex % demoQuestions.length];
  state.answerChanges += 1;
  const answer = forceCorrect ? question.correctAnswer : randomItem(question.options);
  return {
    userId,
    timestamp: new Date().toISOString(),
    eventType: "answer_change",
    metadata: {
      questionId: question.id,
      answer,
      previousAnswer: state.lastAnswer || null,
      changeCount: state.answerChanges,
      timeSpentSec: Math.floor(6 + Math.random() * 32),
      isCorrect: answer === question.correctAnswer,
      difficulty: question.difficulty
    }
  };
}

function makeProfileEvent(userId, state) {
  const profile = PROFILES[userId] || "normal";

  if (profile === "tab_switcher") {
    if (choice(0.46)) {
      return {
        userId,
        timestamp: new Date().toISOString(),
        eventType: "tab_switch",
        metadata: {
          hiddenDurationSec: Math.floor(9 + Math.random() * 34),
          reason: "Visibility hidden during active exam"
        }
      };
    }
    if (choice(0.18)) {
      return {
        userId,
        timestamp: new Date().toISOString(),
        eventType: "fullscreen_exit",
        metadata: { reason: "Browser fullscreen exited" }
      };
    }
    return makeSubmission(userId, state, "fast");
  }

  if (profile === "answer_changer") {
    if (state.answerChanges < 3 || choice(0.62)) {
      return makeAnswerChange(userId, state, state.answerChanges >= 2 && choice(0.55));
    }
    return makeSubmission(userId, state, choice(0.55) ? "fast" : "normal");
  }

  if (profile === "idle_slow") {
    if (choice(0.42)) {
      return {
        userId,
        timestamp: new Date().toISOString(),
        eventType: "idle",
        metadata: {
          durationSec: Math.floor(48 + Math.random() * 88),
          reason: "No mouse or keyboard activity"
        }
      };
    }
    return makeSubmission(userId, state, "slow");
  }

  if (profile === "mixed") {
    if (choice(0.22)) {
      return {
        userId,
        timestamp: new Date().toISOString(),
        eventType: "tab_switch",
        metadata: { hiddenDurationSec: Math.floor(4 + Math.random() * 14), reason: "Visibility hidden" }
      };
    }
    if (choice(0.3)) return makeAnswerChange(userId, state, false);
    return makeSubmission(userId, state, choice(0.2) ? "fast" : "normal");
  }

  if (choice(0.18)) {
    return {
      userId,
      timestamp: new Date().toISOString(),
      eventType: "activity",
      metadata: { activityType: randomItem(["mousemove", "keydown"]), count: Math.floor(1 + Math.random() * 12) }
    };
  }
  return makeSubmission(userId, state, "normal");
}

export class Simulator {
  constructor(store, analyticsService, intervalMs = 2600) {
    this.store = store;
    this.analyticsService = analyticsService;
    this.intervalMs = intervalMs;
    this.timer = null;
    this.states = new Map(
      demoUsers.map((user, index) => [
        user.id,
        {
          questionIndex: index % demoQuestions.length,
          answerChanges: 0,
          lastAnswer: null
        }
      ])
    );
  }

  status() {
    return {
      running: Boolean(this.timer),
      intervalMs: this.intervalMs
    };
  }

  start() {
    if (this.timer) return this.status();
    this.timer = setInterval(() => {
      this.tick().catch((error) => {
        console.error("Simulator tick failed", error);
      });
    }, this.intervalMs);
    return this.status();
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    return this.status();
  }

  async tick() {
    const usersToUpdate = demoUsers.filter(() => choice(0.65));
    if (!usersToUpdate.length) return [];

    const inserted = [];
    for (const user of usersToUpdate) {
      const state = this.states.get(user.id) || { questionIndex: 0, answerChanges: 0, lastAnswer: null };
      const event = makeProfileEvent(user.id, state);
      if (event.metadata?.answer) state.lastAnswer = event.metadata.answer;
      this.states.set(user.id, state);
      inserted.push(await this.store.insertEvent(event));
    }

    await this.analyticsService.recompute();
    return inserted;
  }
}
