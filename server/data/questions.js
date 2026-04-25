export const demoQuestions = [
  {
    id: "q-101",
    prompt: "Which data structure uses FIFO ordering?",
    options: ["Stack", "Queue", "Heap", "Tree"],
    correctAnswer: "Queue",
    difficulty: "easy"
  },
  {
    id: "q-102",
    prompt: "What is the time complexity of binary search on a sorted array?",
    options: ["O(1)", "O(log n)", "O(n)", "O(n log n)"],
    correctAnswer: "O(log n)",
    difficulty: "easy"
  },
  {
    id: "q-103",
    prompt: "Which normal form removes transitive dependency?",
    options: ["1NF", "2NF", "3NF", "BCNF"],
    correctAnswer: "3NF",
    difficulty: "medium"
  },
  {
    id: "q-104",
    prompt: "In TCP congestion control, what does slow start increase?",
    options: ["TTL", "Window size", "Port range", "Checksum length"],
    correctAnswer: "Window size",
    difficulty: "medium"
  },
  {
    id: "q-105",
    prompt: "Which model is commonly used for anomaly detection?",
    options: ["Isolation Forest", "K-means rendering", "AES", "BFS"],
    correctAnswer: "Isolation Forest",
    difficulty: "hard"
  },
  {
    id: "q-106",
    prompt: "What does ACID guarantee in databases?",
    options: ["Compression", "Transaction reliability", "Load balancing", "DNS routing"],
    correctAnswer: "Transaction reliability",
    difficulty: "hard"
  }
];

export const demoUsers = [
  { id: "stu-001", name: "Aria Menon", role: "student" },
  { id: "stu-002", name: "Rohan Mehta", role: "student" },
  { id: "stu-003", name: "Nia Shah", role: "student" },
  { id: "stu-004", name: "Dev Patel", role: "student" },
  { id: "stu-005", name: "Isha Rao", role: "student" },
  { id: "stu-006", name: "Kabir Sinha", role: "student" }
];

const questionById = new Map(demoQuestions.map((question) => [question.id, question]));

function event(userId, minutesAgo, eventType, metadata = {}) {
  return {
    userId,
    timestamp: new Date(Date.now() - minutesAgo * 60 * 1000).toISOString(),
    eventType,
    metadata
  };
}

function submit(userId, minutesAgo, questionId, answer, timeSpentSec, extra = {}) {
  const question = questionById.get(questionId);
  return event(userId, minutesAgo, "question_submit", {
    questionId,
    answer,
    timeSpentSec,
    isCorrect: question?.correctAnswer === answer,
    difficulty: question?.difficulty,
    ...extra
  });
}

export function buildSeedEvents() {
  return [
    submit("stu-001", 18, "q-101", "Queue", 42),
    submit("stu-001", 15, "q-102", "O(log n)", 39),
    submit("stu-001", 12, "q-103", "2NF", 58),
    submit("stu-001", 8, "q-104", "Window size", 63),

    event("stu-002", 21, "tab_switch", { hiddenDurationSec: 19, reason: "Window lost focus" }),
    submit("stu-002", 20, "q-101", "Queue", 7),
    event("stu-002", 19, "fullscreen_exit", { reason: "Escape key or browser chrome interaction" }),
    event("stu-002", 18, "tab_switch", { hiddenDurationSec: 31, reason: "Visibility hidden" }),
    submit("stu-002", 17, "q-102", "O(log n)", 5),
    event("stu-002", 16, "tab_switch", { hiddenDurationSec: 14, reason: "Visibility hidden" }),
    event("stu-002", 15, "tab_switch", { hiddenDurationSec: 22, reason: "Visibility hidden" }),
    submit("stu-002", 13, "q-105", "Isolation Forest", 6),

    submit("stu-003", 24, "q-101", "Stack", 31),
    event("stu-003", 22, "answer_change", {
      questionId: "q-102",
      answer: "O(n)",
      previousAnswer: null,
      changeCount: 1,
      timeSpentSec: 15,
      isCorrect: false,
      difficulty: "easy"
    }),
    event("stu-003", 21, "answer_change", {
      questionId: "q-102",
      answer: "O(1)",
      previousAnswer: "O(n)",
      changeCount: 2,
      timeSpentSec: 24,
      isCorrect: false,
      difficulty: "easy"
    }),
    event("stu-003", 20, "answer_change", {
      questionId: "q-102",
      answer: "O(log n)",
      previousAnswer: "O(1)",
      changeCount: 3,
      timeSpentSec: 27,
      isCorrect: true,
      difficulty: "easy"
    }),
    submit("stu-003", 19, "q-102", "O(log n)", 30, { answerChanges: 3 }),
    event("stu-003", 16, "answer_change", {
      questionId: "q-105",
      answer: "AES",
      changeCount: 1,
      timeSpentSec: 5,
      isCorrect: false,
      difficulty: "hard"
    }),
    event("stu-003", 15, "answer_change", {
      questionId: "q-105",
      answer: "Isolation Forest",
      previousAnswer: "AES",
      changeCount: 2,
      timeSpentSec: 8,
      isCorrect: true,
      difficulty: "hard"
    }),
    submit("stu-003", 14, "q-105", "Isolation Forest", 9, { answerChanges: 2 }),

    submit("stu-004", 22, "q-101", "Queue", 47),
    event("stu-004", 19, "idle", { durationSec: 84, reason: "No mouse or keyboard activity" }),
    submit("stu-004", 17, "q-102", "O(log n)", 132),
    event("stu-004", 13, "idle", { durationSec: 68, reason: "No mouse or keyboard activity" }),
    submit("stu-004", 10, "q-103", "3NF", 126),

    submit("stu-005", 16, "q-101", "Queue", 51),
    submit("stu-005", 13, "q-102", "O(log n)", 45),
    submit("stu-005", 10, "q-103", "3NF", 59),

    submit("stu-006", 11, "q-101", "Queue", 19),
    event("stu-006", 10, "tab_switch", { hiddenDurationSec: 9, reason: "Visibility hidden" }),
    submit("stu-006", 8, "q-102", "O(log n)", 18),
    event("stu-006", 6, "answer_change", {
      questionId: "q-104",
      answer: "TTL",
      changeCount: 1,
      timeSpentSec: 16,
      isCorrect: false,
      difficulty: "medium"
    }),
    submit("stu-006", 5, "q-104", "Window size", 25, { answerChanges: 1 })
  ];
}
