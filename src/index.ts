import crypto from "crypto";
import express, { type Request, type Response, type NextFunction } from "express";
import path from "path";
import { fileURLToPath } from "url";
import apiRouter from "./api/router.js";
import { start } from "./recorder/manager.js";
import { startCleanup } from "./recorder/cleanup.js";
import { initStorage } from "./storage/index.js";
import { initMqtt } from "./mqtt/publisher.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;
const UI_PASSWORD = process.env.UI_PASSWORD || "";

const app = express();

// Derive a stable auth token from the password so it survives container restarts
const AUTH_TOKEN = UI_PASSWORD
  ? crypto.createHmac("sha256", "dingdongditch").update(UI_PASSWORD).digest("hex")
  : "";

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// --- Auth gate (skipped if UI_PASSWORD is not set) ---

const LOGIN_HTML = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>DingDongDitch - Login</title><link rel="stylesheet" href="/style.css"/></head>
<body><main style="max-width:400px;margin:4rem auto;padding:0 1rem;">
<h1 style="text-align:center;margin-bottom:1.5rem;">DingDongDitch</h1>
<div class="card"><h3 style="margin-bottom:0.75rem;">Login</h3>
<div id="msg"></div>
<form method="POST" action="/login">
<div style="margin-bottom:0.5rem;"><label for="password">Password</label>
<input type="password" name="password" id="password" autofocus/></div>
<button class="primary" type="submit">Login</button>
</form></div></main></body></html>`;

app.get("/login", (req: Request, res: Response) => {
  if (!UI_PASSWORD) return res.redirect("/");
  res.type("html").send(LOGIN_HTML);
});

app.post("/login", (req: Request, res: Response) => {
  if (!UI_PASSWORD) return res.redirect("/");
  const { password } = req.body;
  if (password === UI_PASSWORD) {
    res.cookie("auth_token", AUTH_TOKEN, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 365 * 24 * 60 * 60 * 1000 });
    return res.redirect("/");
  }
  res.type("html").send(LOGIN_HTML.replace('<div id="msg"></div>',
    '<div class="msg error">Invalid password.</div>'));
});

app.post("/logout", (_req: Request, res: Response) => {
  res.clearCookie("auth_token", { path: "/" });
  res.redirect("/login");
});

// Auth middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  if (!UI_PASSWORD) return next();
  // Allow style.css to load on login page
  if (req.path === "/style.css" || req.path === "/api/health") return next();
  const token = parseCookie(req.headers.cookie, "auth_token");
  if (token && token === AUTH_TOKEN) return next();
  if (req.path.startsWith("/api/")) return res.status(401).json({ error: "unauthorized" });
  res.redirect("/login");
});

function parseCookie(cookieHeader: string | undefined, name: string): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? match[1] : null;
}

// --- App routes ---

app.get("/api/health", (_req: Request, res: Response) => res.json({ ok: true }));
app.use("/api", apiRouter);
app.use(express.static(path.join(__dirname, "public")));

// SPA fallback
app.get("*", (_req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`[server] listening on :${PORT}`);
  if (UI_PASSWORD) console.log("[server] UI password protection enabled");
});

// Initialize MQTT (no-op if disabled)
initMqtt();

// Initialize storage then start services
initStorage().then(() => {
  start().catch((e) => {
    console.error("[startup] recorder failed to start:", (e as Error).message);
  });
  startCleanup();
}).catch((e) => {
  console.error("[startup] storage init failed:", (e as Error).message);
  process.exit(1);
});
