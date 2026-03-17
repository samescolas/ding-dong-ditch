import { useState, useRef } from "react";
import { api } from "../hooks/useApi";
import { useToast } from "../contexts/ToastContext";
import PageHeader from "./PageHeader";

interface AuthTabProps {
  connected: boolean;
  onConnected: () => Promise<void>;
}

interface LoginResponse {
  needs2fa?: boolean;
  sessionId?: string;
  prompt?: string;
}

export default function AuthTab({ connected, onConnected }: AuthTabProps) {
  const [showTfa, setShowTfa] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [tfaPrompt, setTfaPrompt] = useState("");
  const [loginDisabled, setLoginDisabled] = useState(false);
  const [tfaDisabled, setTfaDisabled] = useState(false);
  const [tokenDisabled, setTokenDisabled] = useState(false);
  const [showToken, setShowToken] = useState(false);

  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const tfaCodeRef = useRef<HTMLInputElement>(null);
  const tokenRef = useRef<HTMLTextAreaElement>(null);
  const { showToast } = useToast();

  function resetTfa() {
    setShowTfa(false);
    setSessionId(null);
    setTfaPrompt("");
    if (emailRef.current) emailRef.current.value = "";
    if (passwordRef.current) passwordRef.current.value = "";
    if (tfaCodeRef.current) tfaCodeRef.current.value = "";
  }

  async function handleLogin() {
    const email = emailRef.current?.value.trim() || "";
    const password = passwordRef.current?.value || "";
    if (!email || !password) return;

    setLoginDisabled(true);
    try {
      const data = await api<LoginResponse>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      if (data.needs2fa) {
        setSessionId(data.sessionId || null);
        setTfaPrompt(data.prompt || "");
        setShowTfa(true);
        setTimeout(() => tfaCodeRef.current?.focus(), 0);
      } else {
        await onConnected();
      }
    } catch (e) {
      showToast((e as Error).message, "error");
    } finally {
      setLoginDisabled(false);
    }
  }

  async function handleTfaVerify() {
    const code = tfaCodeRef.current?.value.trim() || "";
    if (!code || !sessionId) return;

    setTfaDisabled(true);
    try {
      await api("/api/auth/login/verify", {
        method: "POST",
        body: JSON.stringify({ sessionId, code }),
      });
      resetTfa();
      await onConnected();
    } catch (e) {
      showToast((e as Error).message, "error");
    } finally {
      setTfaDisabled(false);
    }
  }

  async function handleTokenSave() {
    const token = tokenRef.current?.value.trim() || "";
    if (!token) return;

    setTokenDisabled(true);
    try {
      await api("/api/auth/token", {
        method: "POST",
        body: JSON.stringify({ refreshToken: token }),
      });
      if (tokenRef.current) tokenRef.current.value = "";
      await onConnected();
    } catch (e) {
      showToast((e as Error).message, "error");
    } finally {
      setTokenDisabled(false);
    }
  }

  if (connected) {
    return (
      <div>
        <PageHeader title="Ring Account" />
        <div className="card">
          <div className="flex items-center gap-3">
            <span className="status-dot status-dot--connected" />
            <div>
              <p style={{ fontWeight: "var(--font-weight-medium)" }}>Connected to Ring</p>
              <p className="text-sm text-muted" style={{ marginTop: "var(--space-1)" }}>
                Manage your cameras from the Cameras tab.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      {/* Branding */}
      <div className="auth-page__brand">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-fg-accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 01-3.46 0" />
        </svg>
        <h1 className="auth-page__title">DingDongDitch</h1>
        <p className="auth-page__tagline">Ring camera recording & monitoring</p>
      </div>

      {/* Step indicator */}
      <div className="auth-page__steps">
        <div className={`auth-page__step ${!showTfa ? "auth-page__step--active" : "auth-page__step--done"}`}>
          <span className="auth-page__step-dot">1</span>
          <span className="auth-page__step-label">Credentials</span>
        </div>
        <div className="auth-page__step-line" />
        <div className={`auth-page__step ${showTfa ? "auth-page__step--active" : ""}`}>
          <span className="auth-page__step-dot">2</span>
          <span className="auth-page__step-label">Verify</span>
        </div>
      </div>

      {/* Login form */}
      {!showTfa && (
        <div className="card auth-page__card page-enter">
          <h3 className="auth-page__card-title">Sign In</h3>
          <div className="auth-page__field">
            <label htmlFor="login-email">Email</label>
            <input
              type="text"
              id="login-email"
              className="input"
              ref={emailRef}
              placeholder="ring@example.com"
              autoComplete="email"
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); passwordRef.current?.focus(); }
              }}
            />
          </div>
          <div className="auth-page__field">
            <label htmlFor="login-password">Password</label>
            <input
              type="password"
              id="login-password"
              className="input"
              ref={passwordRef}
              placeholder="Password"
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); handleLogin(); }
              }}
            />
          </div>
          <button className="btn btn-primary" style={{ width: "100%", marginTop: "var(--space-4)" }} disabled={loginDisabled} onClick={handleLogin}>
            Sign In
          </button>
        </div>
      )}

      {/* 2FA form */}
      {showTfa && (
        <div className="card auth-page__card page-enter">
          <h3 className="auth-page__card-title">Two-Factor Authentication</h3>
          <p className="text-sm text-muted" style={{ marginBottom: "var(--space-4)" }}>
            {tfaPrompt}
          </p>
          <div className="auth-page__field">
            <label htmlFor="tfa-code">Code</label>
            <input
              type="text"
              id="tfa-code"
              className="input"
              ref={tfaCodeRef}
              placeholder="123456"
              autoComplete="one-time-code"
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); handleTfaVerify(); }
              }}
            />
          </div>
          <div className="flex gap-3" style={{ marginTop: "var(--space-4)" }}>
            <button className="btn btn-primary" style={{ flex: 1 }} disabled={tfaDisabled} onClick={handleTfaVerify}>
              Verify
            </button>
            <button className="btn" onClick={resetTfa}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Token paste */}
      <div className="auth-page__advanced">
        <button
          className="btn btn-ghost text-sm"
          onClick={() => setShowToken(!showToken)}
          aria-expanded={showToken}
        >
          {showToken ? "Hide" : "Advanced: connect with refresh token"}
        </button>
        {showToken && (
          <div className="card auth-page__card page-enter" style={{ marginTop: "var(--space-3)" }}>
            <div className="auth-page__field">
              <label htmlFor="token-input">Refresh Token</label>
              <textarea
                id="token-input"
                className="input"
                ref={tokenRef}
                rows={3}
                placeholder="Paste your Ring refresh token here..."
                style={{ resize: "vertical" }}
              />
            </div>
            <button
              className="btn btn-primary"
              style={{ width: "100%", marginTop: "var(--space-3)" }}
              disabled={tokenDisabled}
              onClick={handleTokenSave}
            >
              Connect
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
