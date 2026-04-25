export const API_BASE = "https://verisight-aii.onrender.com";
  
async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `Request failed with ${response.status}`);
  }

  return response.json();
}

export function fetchAnalytics() {
  return request("/api/analytics");
}

export function fetchParticipant(userId) {
  return request(`/api/analytics/${encodeURIComponent(userId)}`);
}

export function startSession(payload) {
  return request("/api/sessions", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function logEvent(payload) {
  return request("/api/events", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function simulatorStatus() {
  return request("/api/simulator/status");
}

export function startSimulator() {
  return request("/api/simulator/start", { method: "POST" });
}

export function stopSimulator() {
  return request("/api/simulator/stop", { method: "POST" });
}

export function resetSimulator() {
  return request("/api/simulator/reset", { method: "POST" });
}
