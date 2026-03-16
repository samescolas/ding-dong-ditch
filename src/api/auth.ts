import { Router, type Request, type Response } from "express";
import { RingApi } from "ring-client-api";
import { RingRestClient } from "ring-client-api/rest-client";
import { getToken, setToken } from "../config/store.js";
import { getRingApi, restart } from "../recorder/manager.js";
import type { LoginSession } from "../types.js";

const router = Router();

// In-progress login sessions keyed by a simple session id
const loginSessions = new Map<string, LoginSession>();

// Get auth status
router.get("/status", (_req: Request, res: Response) => {
  const hasToken = !!getToken();
  const connected = !!getRingApi();
  res.json({ hasToken, connected });
});

// Step 1: Start login with email + password
router.post("/login", async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "email and password are required" });
  }

  const sessionId = Math.random().toString(36).slice(2);

  try {
    const restClient = new RingRestClient({ email, password });

    try {
      const auth = await restClient.getCurrentAuth();
      // No 2FA needed — save token directly
      setToken(auth.refresh_token);
      await restart();
      return res.json({ ok: true, needs2fa: false });
    } catch (e) {
      if (restClient.using2fa) {
        // 2FA required — store session for step 2
        loginSessions.set(sessionId, { restClient, createdAt: Date.now() });
        // Clean up old sessions after 5 minutes
        setTimeout(() => loginSessions.delete(sessionId), 5 * 60 * 1000);
        return res.json({
          ok: true,
          needs2fa: true,
          sessionId,
          prompt: restClient.promptFor2fa || "Enter your 2FA code",
        });
      }
      throw e;
    }
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

// Step 2: Submit 2FA code
router.post("/login/verify", async (req: Request, res: Response) => {
  const { sessionId, code } = req.body;
  if (!sessionId || !code) {
    return res.status(400).json({ error: "sessionId and code are required" });
  }

  const session = loginSessions.get(sessionId);
  if (!session) {
    return res.status(400).json({ error: "Login session expired. Please start over." });
  }

  try {
    const auth = await session.restClient.getAuth(code);
    loginSessions.delete(sessionId);

    setToken(auth.refresh_token);
    await restart();

    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

// Set refresh token directly (manual paste)
router.post("/token", async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  if (!refreshToken || typeof refreshToken !== "string") {
    return res.status(400).json({ error: "refreshToken is required" });
  }

  try {
    const testApi = new RingApi({ refreshToken: refreshToken.trim() });
    const cams = await testApi.getCameras();
    testApi.disconnect();

    setToken(refreshToken.trim());
    await restart();

    res.json({ ok: true, cameras: cams.length });
  } catch (e) {
    res.status(400).json({ error: `Invalid token: ${(e as Error).message}` });
  }
});

export default router;
