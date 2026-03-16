const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

// Tab navigation
$$("nav button").forEach((btn) => {
  btn.addEventListener("click", () => {
    switchToTab(btn.dataset.tab);
    if (btn.dataset.tab === "cameras") loadCameras();
    if (btn.dataset.tab === "settings") loadSettings();
    if (btn.dataset.tab === "recordings") loadRecordings();
  });
});

function showMsg(container, text, type) {
  const el = typeof container === "string" ? $(container) : container;
  el.innerHTML = `<div class="msg ${type}">${esc(text)}</div>`;
  setTimeout(() => (el.innerHTML = ""), 4000);
}

function esc(s) {
  const d = document.createElement("div");
  d.textContent = s;
  return d.innerHTML;
}

// --- Auth status ---
function switchToTab(tab) {
  $$("nav button").forEach((b) => b.classList.remove("active"));
  $$(".section").forEach((s) => s.classList.remove("active"));
  $(`nav button[data-tab="${tab}"]`).classList.add("active");
  $(`#tab-${tab}`).classList.add("active");
  location.hash = tab;
}

async function checkStatus() {
  try {
    const res = await fetch("/api/auth/status");
    const data = await res.json();
    const dot = $("#status-indicator");
    if (data.connected) {
      dot.innerHTML = '<span class="status-dot connected"></span>Connected';
      $("#tab-auth").innerHTML = '<h2>Ring Account</h2><div id="auth-msg"></div><div class="card"><p>Connected to Ring. Manage your cameras from the Cameras tab.</p><button class="danger" id="logout-btn" style="margin-top:0.5rem;">Disconnect</button></div>';
      $("#logout-btn").addEventListener("click", () => location.reload());
    } else {
      dot.innerHTML = '<span class="status-dot disconnected"></span>Disconnected';
    }
  } catch {}
}

async function onConnected() {
  await checkStatus();
  switchToTab("cameras");
  loadCameras();
}

// --- Login flow ---
let loginSessionId = null;

// Enter key submits login form
$("#login-email").addEventListener("keydown", (e) => {
  if (e.key === "Enter") { e.preventDefault(); $("#login-password").focus(); }
});
$("#login-password").addEventListener("keydown", (e) => {
  if (e.key === "Enter") { e.preventDefault(); $("#login-btn").click(); }
});
$("#tfa-code").addEventListener("keydown", (e) => {
  if (e.key === "Enter") { e.preventDefault(); $("#tfa-btn").click(); }
});

$("#login-btn").addEventListener("click", async () => {
  const email = $("#login-email").value.trim();
  const password = $("#login-password").value;
  if (!email || !password) return;

  $("#login-btn").disabled = true;
  try {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();

    if (!res.ok) {
      showMsg("#auth-msg", data.error, "error");
      return;
    }

    if (data.needs2fa) {
      loginSessionId = data.sessionId;
      $("#tfa-prompt").textContent = data.prompt;
      $("#login-card").style.display = "none";
      $("#tfa-card").style.display = "block";
      $("#tfa-code").focus();
    } else {
      await onConnected();
    }
  } catch (e) {
    showMsg("#auth-msg", e.message, "error");
  } finally {
    $("#login-btn").disabled = false;
  }
});

// 2FA verify
$("#tfa-btn").addEventListener("click", async () => {
  const code = $("#tfa-code").value.trim();
  if (!code || !loginSessionId) return;

  $("#tfa-btn").disabled = true;
  try {
    const res = await fetch("/api/auth/login/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: loginSessionId, code }),
    });
    const data = await res.json();

    if (!res.ok) {
      showMsg("#auth-msg", data.error, "error");
      return;
    }

    reset2fa();
    await onConnected();
  } catch (e) {
    showMsg("#auth-msg", e.message, "error");
  } finally {
    $("#tfa-btn").disabled = false;
  }
});

$("#tfa-cancel").addEventListener("click", reset2fa);

function reset2fa() {
  loginSessionId = null;
  $("#tfa-card").style.display = "none";
  $("#login-card").style.display = "block";
  $("#tfa-code").value = "";
  $("#login-email").value = "";
  $("#login-password").value = "";
}

// --- Manual token paste ---
$("#save-token").addEventListener("click", async () => {
  const token = $("#token-input").value.trim();
  if (!token) return;
  $("#save-token").disabled = true;
  try {
    const res = await fetch("/api/auth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: token }),
    });
    const data = await res.json();
    if (res.ok) {
      $("#token-input").value = "";
      await onConnected();
    } else {
      showMsg("#auth-msg", data.error, "error");
    }
  } catch (e) {
    showMsg("#auth-msg", e.message, "error");
  } finally {
    $("#save-token").disabled = false;
  }
});

// --- Cameras ---
async function loadCameras() {
  try {
    const res = await fetch("/api/cameras");
    const cams = await res.json();
    const container = $("#cameras-list");

    if (!cams.length) {
      container.innerHTML = '<p class="empty">No cameras found. Check your Ring connection.</p>';
      return;
    }

    container.innerHTML = cams
      .map(
        (c) => `
      <div class="card" data-cam-id="${c.id}">
        <div class="cam-header">
          <h3>${esc(c.name)}</h3>
          <label class="toggle">
            <input type="checkbox" ${c.config.enabled ? "checked" : ""} data-field="enabled" />
            <span class="slider"></span>
          </label>
        </div>
        <div class="cam-fields">
          <div>
            <label>Recording Duration (s)</label>
            <input type="number" value="${c.config.recordingDuration}" data-field="recordingDuration" min="10" max="600" />
          </div>
          <div>
            <label>Cooldown (s)</label>
            <input type="number" value="${c.config.cooldownSeconds}" data-field="cooldownSeconds" min="0" max="600" />
          </div>
        </div>
        <button class="primary save-cam">Save</button>
      </div>`
      )
      .join("");

    container.querySelectorAll(".save-cam").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const card = btn.closest(".card");
        const id = card.dataset.camId;
        const enabled = card.querySelector('[data-field="enabled"]').checked;
        const recordingDuration = parseInt(card.querySelector('[data-field="recordingDuration"]').value, 10);
        const cooldownSeconds = parseInt(card.querySelector('[data-field="cooldownSeconds"]').value, 10);

        const res = await fetch(`/api/cameras/${id}/config`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ enabled, recordingDuration, cooldownSeconds }),
        });
        if (res.ok) {
          btn.textContent = "Saved!";
          setTimeout(() => (btn.textContent = "Save"), 1500);
        }
      });
    });
  } catch {}
}

// --- Settings ---
async function loadSettings() {
  try {
    const res = await fetch("/api/config");
    const data = await res.json();
    $("#default-duration").value = data.recordingDuration;
    $("#default-cooldown").value = data.cooldownSeconds;
    $("#default-retention").value = data.retentionDays;
  } catch {}
}

$("#save-settings").addEventListener("click", async () => {
  const recordingDuration = parseInt($("#default-duration").value, 10);
  const cooldownSeconds = parseInt($("#default-cooldown").value, 10);
  const retentionDays = parseInt($("#default-retention").value, 10);
  try {
    const res = await fetch("/api/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recordingDuration, cooldownSeconds, retentionDays }),
    });
    if (res.ok) showMsg("#settings-msg", "Settings saved.", "success");
  } catch (e) {
    showMsg("#settings-msg", e.message, "error");
  }
});

// --- Recordings ---
async function loadRecordings() {
  try {
    const res = await fetch("/api/recordings");
    const clips = await res.json();
    const container = $("#recordings-list");

    if (!clips.length) {
      container.innerHTML = '<p class="empty">No recordings yet.</p>';
      return;
    }

    container.innerHTML = `<ul class="clip-list">${clips
      .map(
        (c) => `
      <li>
        <div class="clip-info">
          <span class="camera">${esc(c.camera)}</span>
          <span class="time">${esc(c.date)} ${esc(c.file.replace(".mp4", "").replace(/-/g, ":"))}</span>
          <span class="size">${(c.size / 1024 / 1024).toFixed(1)} MB</span>
        </div>
        <div>
          <button class="primary" onclick="playClip('${c.path}')">Play</button>
          <button class="danger" onclick="deleteClip('${c.path}')" style="margin-left:0.25rem;">Delete</button>
        </div>
      </li>`
      )
      .join("")}</ul>`;
  } catch {}
}

window.deleteClip = async function (clipPath) {
  if (!confirm("Delete this recording?")) return;
  try {
    const res = await fetch(`/api/recordings/${clipPath}`, { method: "DELETE" });
    if (res.ok) loadRecordings();
  } catch {}
};

window.playClip = function (clipPath) {
  const player = $("#player");
  const container = $("#player-container");
  player.src = `/api/recordings/${clipPath}`;
  container.style.display = "block";
  player.play();
};

function closePlayer() {
  const player = $("#player");
  const container = $("#player-container");
  player.pause();
  player.src = "";
  container.style.display = "none";
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closePlayer();
});

// Init — restore tab from hash, default to recordings when connected
checkStatus().then(() => {
  const validTabs = ["auth", "cameras", "settings", "recordings"];
  const hashTab = location.hash.replace("#", "");
  if (validTabs.includes(hashTab)) {
    switchToTab(hashTab);
  } else {
    const connected = $("#status-indicator").textContent.includes("Connected");
    switchToTab(connected ? "recordings" : "auth");
  }

  const active = location.hash.replace("#", "");
  if (active === "cameras") loadCameras();
  if (active === "settings") loadSettings();
  if (active === "recordings") loadRecordings();
});
loadSettings();

// Show logout button if auth is enabled (we got past the login page)
fetch("/api/health").then(() => {
  const form = $("#logout-form");
  if (form && document.cookie.includes("auth_token")) form.style.display = "block";
});
