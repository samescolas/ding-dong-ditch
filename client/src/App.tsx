import { useState, useEffect, useCallback } from "react";
import Navigation from "./components/Navigation";
import AuthTab from "./components/AuthTab";
import CamerasTab from "./components/CamerasTab";
import SettingsTab from "./components/SettingsTab";
import RecordingsTab from "./components/RecordingsTab";

type Tab = "auth" | "cameras" | "settings" | "recordings";

const VALID_TABS: Tab[] = ["auth", "cameras", "settings", "recordings"];

function getHashTab(): Tab | null {
  const hash = window.location.hash.replace("#", "") as Tab;
  return VALID_TABS.includes(hash) ? hash : null;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("auth");
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
      const hashTab = getHashTab();
      if (hashTab) {
        setActiveTab(hashTab);
      } else {
        setActiveTab(isConnected ? "recordings" : "auth");
      }
      setReady(true);
    });
  }, [checkStatus]);

  const switchTab = useCallback((tab: Tab) => {
    setActiveTab(tab);
    window.location.hash = tab;
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
        <div className={`page-content${activeTab === "recordings" ? " page-content--wide" : ""} page-enter`} key={activeTab}>
          {activeTab === "auth" && (
            <AuthTab connected={connected} onConnected={onConnected} />
          )}
          {activeTab === "cameras" && <CamerasTab connected={connected} />}
          {activeTab === "settings" && <SettingsTab />}
          {activeTab === "recordings" && <RecordingsTab />}
        </div>
      </main>
    </div>
  );
}
