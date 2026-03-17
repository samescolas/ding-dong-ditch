import { useState, useRef } from "react";
import { api } from "../hooks/useApi";

interface AuthTabProps {
  connected: boolean;
  onConnected: () => Promise<void>;
}

interface LoginResponse {
  needs2fa?: boolean;
  sessionId?: string;
  prompt?: string;
}

interface MsgState {
  text: string;
  type: "error" | "success";
}

export default function AuthTab({ connected, onConnected }: AuthTabProps) {
  const [msg, setMsg] = useState<MsgState | null>(null);
  const [showTfa, setShowTfa] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [tfaPrompt, setTfaPrompt] = useState("");
  const [loginDisabled, setLoginDisabled] = useState(false);
  const [tfaDisabled, setTfaDisabled] = useState(false);
  const [tokenDisabled, setTokenDisabled] = useState(false);

  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const tfaCodeRef = useRef<HTMLInputElement>(null);
  const tokenRef = useRef<HTMLTextAreaElement>(null);

  function showMessage(text: string, type: "error" | "success") {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 4000);
  }

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
      showMessage((e as Error).message, "error");
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
      showMessage((e as Error).message, "error");
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
      showMessage((e as Error).message, "error");
    } finally {
      setTokenDisabled(false);
    }
  }

  if (connected) {
    return (
      <div>
        <h2>Ring Account</h2>
        {msg && <div className={`msg ${msg.type}`}>{msg.text}</div>}
        <div className="card">
          <p>Connected to Ring. Manage your cameras from the Cameras tab.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2>Ring Account</h2>
      {msg && <div className={`msg ${msg.type}`}>{msg.text}</div>}

      {/* Login form */}
      {!showTfa && (
        <div className="card">
          <h3 style={{ marginBottom: "0.75rem" }}>Sign In</h3>
          <div style={{ marginBottom: "0.5rem" }}>
            <label htmlFor="login-email">Email</label>
            <input
              type="text"
              id="login-email"
              ref={emailRef}
              placeholder="ring@example.com"
              autoComplete="email"
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); passwordRef.current?.focus(); }
              }}
            />
          </div>
          <div style={{ marginBottom: "0.5rem" }}>
            <label htmlFor="login-password">Password</label>
            <input
              type="password"
              id="login-password"
              ref={passwordRef}
              placeholder="Password"
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); handleLogin(); }
              }}
            />
          </div>
          <button className="primary" disabled={loginDisabled} onClick={handleLogin}>
            Sign In
          </button>
        </div>
      )}

      {/* 2FA form */}
      {showTfa && (
        <div className="card">
          <h3 style={{ marginBottom: "0.75rem" }}>Two-Factor Authentication</h3>
          <p style={{ fontSize: "0.85rem", color: "#8b949e", marginBottom: "0.5rem" }}>
            {tfaPrompt}
          </p>
          <div style={{ marginBottom: "0.5rem" }}>
            <label htmlFor="tfa-code">Code</label>
            <input
              type="text"
              id="tfa-code"
              ref={tfaCodeRef}
              placeholder="123456"
              autoComplete="one-time-code"
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); handleTfaVerify(); }
              }}
            />
          </div>
          <button className="primary" disabled={tfaDisabled} onClick={handleTfaVerify}>
            Verify
          </button>
          <button className="danger" style={{ marginLeft: "0.5rem" }} onClick={resetTfa}>
            Cancel
          </button>
        </div>
      )}

      {/* Manual token paste */}
      <div className="card">
        <details>
          <summary style={{ cursor: "pointer", color: "#8b949e", fontSize: "0.85rem" }}>
            Or paste a refresh token manually
          </summary>
          <div style={{ marginTop: "0.75rem" }}>
            <label htmlFor="token-input">Refresh Token</label>
            <textarea
              id="token-input"
              ref={tokenRef}
              rows={3}
              placeholder="Paste your Ring refresh token here..."
            />
            <button
              className="primary"
              style={{ marginTop: "0.5rem" }}
              disabled={tokenDisabled}
              onClick={handleTokenSave}
            >
              Connect
            </button>
          </div>
        </details>
      </div>
    </div>
  );
}
