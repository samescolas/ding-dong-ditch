import { useState, useEffect, useCallback } from "react";
import Navigation from "./components/Navigation";
import AuthTab from "./components/AuthTab";
import CamerasTab from "./components/CamerasTab";
import SettingsTab from "./components/SettingsTab";
import RecordingsTab from "./components/RecordingsTab";
import TimelineView from "./components/timeline/TimelineView";

type Tab = "auth" | "cameras" | "settings" | "recordings";
type RecordingsView = "timeline" | "grid";

const VALID_TABS: Tab[] = ["auth", "cameras", "settings", "recordings"];

function parseHash(): { tab: Tab | null; recordingsView: RecordingsView } {
  const hash = window.location.hash.replace("#", "");

  if (hash === "recordings" || hash === "recordings/") {
    return { tab: "recordings", recordingsView: "timeline" };
  }
  if (hash === "recordings/all") {
    return { tab: "recordings", recordingsView: "grid" };
  }

  const tab = hash as Tab;
  return {
    tab: VALID_TABS.includes(tab) ? tab : null,
    recordingsView: "timeline",
  };
}

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("auth");
  const [recordingsView, setRecordingsView] = useState<RecordingsView>("timeline");
  const [connected, setConnected] = useState(false);
  const [ready, setReady] = useState(false);

  const checkStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/status");
      const data = await res.json();
      setConnected(data.connected);
      return data.connected as boolean;
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    checkStatus().then((isConnected) => {
      const { tab, recordingsView: view } = parseHash();
      if (tab) {
        setActiveTab(tab);
        setRecordingsView(view);
      } else {
        setActiveTab(isConnected ? "recordings" : "auth");
        setRecordingsView("timeline");
      }
      setReady(true);
    });
  }, [checkStatus]);

  // Listen for browser back/forward navigation
  useEffect(() => {
    const onHashChange = () => {
      const { tab, recordingsView: view } = parseHash();
      if (tab) {
        setActiveTab(tab);
        setRecordingsView(view);
      }
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const switchTab = useCallback((tab: Tab) => {
    setActiveTab(tab);
    if (tab === "recordings") {
      setRecordingsView("timeline");
      window.location.hash = "recordings";
    } else {
      window.location.hash = tab;
    }
  }, []);

  const switchRecordingsView = useCallback((view: RecordingsView) => {
    setRecordingsView(view);
    window.location.hash = view === "grid" ? "recordings/all" : "recordings";
  }, []);

  const onConnected = useCallback(async () => {
    await checkStatus();
    switchTab("cameras");
  }, [checkStatus, switchTab]);

  if (!ready) return null;

  return (
    <div className="app-layout">
      <Navigation
        activeTab={activeTab}
        connected={connected}
        onSwitchTab={switchTab}
      />
      <main className="main-content">
        <div className={`page-content${activeTab === "recordings" ? " page-content--wide" : ""} page-enter`} key={`${activeTab}-${recordingsView}`}>
          {activeTab === "auth" && (
            <AuthTab connected={connected} onConnected={onConnected} />
          )}
          {activeTab === "cameras" && <CamerasTab connected={connected} />}
          {activeTab === "settings" && <SettingsTab />}
          {activeTab === "recordings" && (
            <>
              <div className="recordings-view-toggle">
                <button
                  className={`btn btn-sm${recordingsView === "timeline" ? " btn--active" : ""}`}
                  onClick={() => switchRecordingsView("timeline")}
                >
                  Timeline
                </button>
                <button
                  className={`btn btn-sm${recordingsView === "grid" ? " btn--active" : ""}`}
                  onClick={() => switchRecordingsView("grid")}
                >
                  Grid
                </button>
              </div>
              {recordingsView === "timeline" ? <TimelineView /> : <RecordingsTab />}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
