import { useEffect, useMemo, useState } from "react";
import {
  fetchAnalytics,
  resetSimulator,
  simulatorStatus,
  startSimulator,
  stopSimulator,
} from "./api";
import { Dashboard } from "./components/Dashboard";
import { Sidebar } from "./components/Sidebar";
import { StudentExam } from "./components/StudentExam";
import { Topbar } from "./components/Topbar";
import { AuthPage } from "./components/AuthPage";
import { useAuth } from "./context/AuthContext";
import { createAnalyticsSocket } from "./socket";

export default function App() {
  const { user, loading: authLoading } = useAuth();
  const [view, setView] = useState("dashboard");
  const [analytics, setAnalytics] = useState(null);
  const [selectedUserId, setSelectedUserId] = useState("stu-002");
  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState("All");
  const [simulator, setSimulator] = useState({ running: false });

  useEffect(() => {
    let mounted = true;

    fetchAnalytics()
      .then((result) => {
        if (mounted) setAnalytics(result);
      })
      .catch(() => {});

    simulatorStatus()
      .then((result) => {
        if (mounted) setSimulator(result);
      })
      .catch(() => {});

    const socket = createAnalyticsSocket();
    socket.on("analytics:update", (result) => {
      setAnalytics(result);
    });

    const fallback = setInterval(() => {
      fetchAnalytics().then(setAnalytics).catch(() => {});
      simulatorStatus().then(setSimulator).catch(() => {});
    }, 7000);

    return () => {
      mounted = false;
      clearInterval(fallback);
      socket.disconnect();
    };
  }, []);

  const participants = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return (analytics?.participants || []).filter((participant) => {
      const matchesSearch =
        !normalizedSearch ||
        participant.userId.toLowerCase().includes(normalizedSearch) ||
        participant.name.toLowerCase().includes(normalizedSearch);

      const matchesRisk =
        riskFilter === "All" || participant.riskLevel === riskFilter;

      return matchesSearch && matchesRisk;
    });
  }, [analytics, search, riskFilter]);

  async function handleStartSimulator() {
    setSimulator(await startSimulator());
  }

  async function handleStopSimulator() {
    setSimulator(await stopSimulator());
  }

  async function handleResetSimulator() {
    const result = await resetSimulator();
    setSimulator(result.simulator || result);
    setAnalytics(await fetchAnalytics());
    setSelectedUserId("stu-002");
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-400">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-400/30 border-t-emerald-400" />
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return (
    <div className="min-h-screen text-slate-100 lg:flex">
      <Sidebar view={view} onViewChange={setView} />

      <div className="min-w-0 flex-1">
        <Topbar
          search={search}
          onSearchChange={setSearch}
          riskFilter={riskFilter}
          onRiskFilterChange={setRiskFilter}
          simulator={simulator}
          onStartSimulator={handleStartSimulator}
          onStopSimulator={handleStopSimulator}
          onResetSimulator={handleResetSimulator}
        />

        {view === "student" ? (
          <StudentExam />
        ) : (
          <Dashboard
            analytics={analytics}
            participants={participants}
            selectedUserId={selectedUserId}
            onSelectUser={setSelectedUserId}
            view={view}
          />
        )}
      </div>
    </div>
  );
}