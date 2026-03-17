import { useEffect, useState } from "react";

type Tab = "auth" | "cameras" | "settings" | "recordings";

interface LayoutProps {
  activeTab: Tab;
  connected: boolean;
  onSwitchTab: (tab: Tab) => void;
}

const TABS: Tab[] = ["auth", "cameras", "settings", "recordings"];

export default function Layout({ activeTab, connected, onSwitchTab }: LayoutProps) {
  const [showLogout, setShowLogout] = useState(false);

  useEffect(() => {
    fetch("/api/health")
      .then(() => {
        if (document.cookie.includes("auth_token")) {
          setShowLogout(true);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <header>
      <h1>DingDongDitch</h1>
      <span>
        <span className={`status-dot ${connected ? "connected" : "disconnected"}`} />
        {connected ? "Connected" : "Disconnected"}
      </span>
      <nav>
        {TABS.map((tab) => (
          <button
            key={tab}
            className={activeTab === tab ? "active" : ""}
            onClick={() => onSwitchTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
        {showLogout && (
          <form method="POST" action="/logout" style={{ display: "inline", marginLeft: "0.5rem" }}>
            <button className="danger" type="submit" style={{ padding: "0.4rem 0.8rem", fontSize: "0.85rem" }}>
              Logout
            </button>
          </form>
        )}
      </nav>
    </header>
  );
}
