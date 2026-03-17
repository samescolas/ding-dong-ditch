import { useEffect, useState } from "react";

type Tab = "auth" | "cameras" | "settings" | "recordings";

interface NavigationProps {
  activeTab: Tab;
  connected: boolean;
  onSwitchTab: (tab: Tab) => void;
}

const NAV_ITEMS: { tab: Tab; label: string; iconPath: string }[] = [
  {
    tab: "auth",
    label: "Auth",
    iconPath: "M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z",
  },
  {
    tab: "cameras",
    label: "Cameras",
    iconPath: "M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z",
  },
  {
    tab: "recordings",
    label: "Recordings",
    iconPath: "M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z",
  },
  {
    tab: "settings",
    label: "Settings",
    iconPath: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z",
  },
];

function DoorbellIcon() {
  return (
    <svg className="sidebar__brand-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 01-3.46 0" />
    </svg>
  );
}

export default function Navigation({ activeTab, connected, onSwitchTab }: NavigationProps) {
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
    <>
      {/* Desktop sidebar */}
      <aside className="sidebar">
        <div className="sidebar__brand">
          <DoorbellIcon />
          <span className="sidebar__brand-title">DingDongDitch</span>
        </div>

        <div className="sidebar__status">
          <span className={`status-dot ${connected ? "status-dot--connected" : "status-dot--disconnected"}`} />
          <span>{connected ? "Connected" : "Disconnected"}</span>
        </div>

        <nav className="sidebar__nav">
          {NAV_ITEMS.map(({ tab, label, iconPath }) => (
            <button
              key={tab}
              className={`sidebar__link${activeTab === tab ? " sidebar__link--active" : ""}`}
              onClick={() => onSwitchTab(tab)}
              aria-current={activeTab === tab ? "page" : undefined}
            >
              <svg className="sidebar__link-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d={iconPath} />
              </svg>
              {label}
            </button>
          ))}
        </nav>

        {showLogout && (
          <div className="sidebar__footer">
            <form method="POST" action="/logout">
              <button className="btn btn-ghost" type="submit" style={{ width: "100%" }} aria-label="Logout">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
                </svg>
                Logout
              </button>
            </form>
          </div>
        )}
      </aside>

      {/* Mobile top bar */}
      <div className="mobile-topbar">
        <span className="mobile-topbar__title">DingDongDitch</span>
        <div className="flex items-center gap-2">
          <span className={`status-dot ${connected ? "status-dot--connected" : "status-dot--disconnected"}`} />
          <span className="text-xs text-muted">{connected ? "Connected" : "Disconnected"}</span>
        </div>
      </div>

      {/* Mobile bottom bar */}
      <nav className="bottom-bar">
        {NAV_ITEMS.map(({ tab, label, iconPath }) => (
          <button
            key={tab}
            className={`bottom-bar__item${activeTab === tab ? " bottom-bar__item--active" : ""}`}
            onClick={() => onSwitchTab(tab)}
            aria-current={activeTab === tab ? "page" : undefined}
            aria-label={label}
          >
            <svg className="bottom-bar__item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d={iconPath} />
            </svg>
            {label}
          </button>
        ))}
      </nav>
    </>
  );
}
