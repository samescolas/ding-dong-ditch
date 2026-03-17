# DingDongDitch

Self-hosted Ring camera motion recorder with flexible storage backends, optional AI-powered snapshot descriptions, and Home Assistant integration.

Records video clips when your Ring cameras detect motion, stores them locally or in S3-compatible storage, and optionally describes snapshots using a vision AI model.

## Features

- **Motion-triggered recording** -- automatically records when Ring cameras detect motion or doorbell presses, with distinct event types tracked per recording
- **React web UI** -- configure cameras, recording settings, and view/play/delete recordings with filtering (camera, date, event type), search, pagination, and multi-select mass delete
- **SQLite metadata database** -- persists AI descriptions, enables full-text search, camera filtering, date range queries, and paginated browsing
- **Ring login** -- sign in with email/password + 2FA directly from the web UI
- **AI snapshot descriptions** -- optionally describe motion snapshots using any OpenAI-compatible vision API (GPT-4o, llava, etc.)
- **Home Assistant integration** -- MQTT auto-discovery for sensors and device triggers
- **Storage backends** -- local/NFS (default, zero config) or S3-compatible (AWS, MinIO, Backblaze B2, Cloudflare R2)
- **Password protection** -- optional password gate on the management UI
- **Auto-cleanup** -- configurable retention period to prevent disk from filling up

## Quick Start

```bash
git clone https://github.com/franciscofsales/ding-dong-ditch.git
cd ding-dong-ditch
cp .env.example .env
# Edit .env with your settings
docker compose up -d
```

- **Web UI**: http://localhost:4280

## Setup

### 1. Configure `.env`

```bash
cp .env.example .env
```

Edit `.env` and set:
- `UI_PASSWORD` -- password for the web UI (recommended if exposed to the internet)

### 2. Start the service

```bash
docker compose up -d
```

### 3. Connect your Ring account

Open http://localhost:4280 and sign in with your Ring email and password. You'll be prompted for a 2FA code if enabled on your account.

### 4. Configure cameras

Switch to the Cameras tab to enable/disable monitoring per camera and adjust recording duration and cooldown.

## Storage Backends

### Local (default)

Recordings are saved to a Docker volume at `/recordings/YYYY-MM-DD/Camera_Name/HH-MM-SS.mp4`. No additional configuration needed. Works with NFS-mounted volumes for network storage.

### S3-compatible

Store recordings in any S3-compatible service (AWS S3, MinIO, Backblaze B2, Cloudflare R2).

Add to `.env`:
```bash
STORAGE_BACKEND=s3
S3_BUCKET=my-recordings
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=your-key
S3_SECRET_ACCESS_KEY=your-secret
# Optional: custom endpoint for non-AWS services
# S3_ENDPOINT=https://s3.us-west-002.backblazeb2.com
# Optional: key prefix
# S3_PREFIX=dingdongditch/
```

Then uncomment the S3 environment variables in `docker-compose.yml`.

## AI Snapshot Descriptions

Optionally send motion snapshots to any OpenAI-compatible vision API to generate a one-sentence description of what triggered the motion. The description is included in MQTT recording events, making it available in Home Assistant automations and notifications.

Add to `.env`:
```bash
AI_ENABLED=true
AI_API_URL=http://localhost:8080/v1   # or https://api.openai.com/v1
AI_API_KEY=sk-...                      # optional for local models
AI_MODEL=gpt-4o                        # or llava, llama3.2-vision, etc.
# AI_PROMPT=Describe what you see in this security camera image in one concise sentence.
```

Then uncomment the AI environment variables in `docker-compose.yml`.

When disabled (default) or when the AI service is unavailable, the description falls back to "Motion detected on {camera name}" so MQTT events always contain a useful message.

## Home Assistant Integration (MQTT)

DingDongDitch can publish recording events to an MQTT broker and auto-register sensors in Home Assistant via [MQTT Discovery](https://www.home-assistant.io/integrations/mqtt/#mqtt-discovery).

Add to `.env`:
```bash
MQTT_ENABLED=true
MQTT_BROKER=mqtt://emqx:1883
```

Then uncomment the MQTT environment variables in `docker-compose.yml` and ensure the container can reach the broker network.

Each Ring camera automatically appears in HA as:
- **Sensor** (`sensor.dingdongditch_<camera>_last_recording`) -- updates with each new recording timestamp and attributes (including `description` when AI is enabled, and `event_type`)
- **Device trigger** -- fires on each recording, usable in automations

### MQTT event payload

Every published event includes an `event_type` field (`"motion"` or `"doorbell"`) alongside the standard recording attributes, so you can branch Home Assistant automations on what actually happened:

```yaml
alias: "DingDongDitch Recording Alert"
description: "Push notification for all recording events, with doorbell callout"
mode: single
triggers:
  - trigger: state
    entity_id: sensor.dingdongditch_front_door_last_recording
conditions: []
actions:
  - action: notify.mobile_app
    data:
      title: >
        {% if trigger.to_state.attributes.event_type == 'doorbell' %}
          Doorbell: {{ trigger.to_state.attributes.camera }}
        {% else %}
          Motion: {{ trigger.to_state.attributes.camera }}
        {% endif %}
      message: "{{ trigger.to_state.attributes.description | default('Recording saved') }}"
      data:
        image: "https://your-host{{ trigger.to_state.attributes.snapshot_url }}"
        url: "https://your-host{{ trigger.to_state.attributes.url }}"
```

### MQTT event filter

You can control which event types are published to MQTT from the **Settings** tab in the web UI, under **Home Assistant Notifications**. Choose from:

| Setting | Publishes |
|---------|-----------|
| All events (default) | Every recording — motion and doorbell |
| Doorbell only | Only doorbell presses |
| Motion only | Only passive motion detections |

This lets you tune which events generate phone notifications without changing your Home Assistant automations.

A snapshot is captured at the moment of motion (before recording starts) so the notification image shows what triggered the event. When AI descriptions are enabled, the notification message will contain what the camera saw (e.g., "A person approaching the front door"). Tapping the notification opens the full recording.

Recordings can also be viewed directly via `https://your-host/api/recordings/<path>`.

## Recording Database

Recording metadata is stored in a SQLite database at `${CONFIG_PATH}/metadata.db` (persisted via the same Docker volume as `config.json`). The database is created automatically on first startup and backfills existing recordings from storage.

### What it stores

Each recording row contains: camera name, date, timestamp, file path, file size, snapshot key, AI description, and **event type** (`motion` or `doorbell`). Descriptions generated by the AI vision API are persisted permanently instead of being lost after MQTT publish. Event type is set at recording time based on the Ring SDK event that triggered it (`onMotionDetected` → `motion`, `onDoorbellPressed` → `doorbell`); existing rows default to `motion`.

### Querying recordings

The `GET /api/recordings` endpoint supports query parameters for filtering and pagination:

| Parameter | Type | Description |
|-----------|------|-------------|
| `camera` | string | Filter by camera name |
| `dateFrom` | string | Start date (YYYY-MM-DD) |
| `dateTo` | string | End date (YYYY-MM-DD) |
| `search` | string | Full-text search on AI descriptions (FTS5) |
| `eventType` | string | Filter by event type: `motion` or `doorbell` |
| `limit` | number | Results per page (default: 50) |
| `offset` | number | Pagination offset (default: 0) |

The response is a paginated object:

```json
{
  "data": [{ "id": 1, "camera": "Front_Door", "date": "2024-01-15", "event_type": "doorbell", ... }],
  "total": 42,
  "limit": 50,
  "offset": 0
}
```

Additional endpoints:
- `GET /api/recordings/cameras` -- returns distinct camera names for filter dropdowns
- `DELETE /api/recordings/:date/:camera/:file` -- removes the recording file, its paired snapshot (if any), and the database record
- `POST /api/recordings/bulk-delete` -- accepts `{ "paths": ["2024-01-15/Front_Door/10-00-00.mp4", ...] }` and deletes each recording + snapshot; returns `{ "deleted": N, "errors": N }`

### Migration

The database schema is versioned via `PRAGMA user_version`. Migrations run automatically on startup. Existing recordings on disk are backfilled into the database on every startup (idempotent via `INSERT OR IGNORE`).

| Version | Change |
|---------|--------|
| v1 | Initial schema: recordings table, FTS5 index, triggers |
| v2 | Added `event_type TEXT DEFAULT 'motion'` column |

## Development

### Prerequisites

- Node.js 20+ (see `.nvmrc`)
- npm

### Backend

```bash
npm install
npm run dev          # Start Express server with hot-reload
npm run build        # Compile TypeScript
npm run typecheck    # Type-check without emitting
```

### Frontend

The React frontend lives in `client/` with its own `package.json`:

```bash
cd client
npm install
npm run dev          # Vite dev server (proxies API to localhost:3000)
npm run build        # Build to dist/client/
```

During development, run the backend (`npm run dev`) and frontend (`cd client && npm run dev`) in separate terminals. The Vite dev server proxies `/api`, `/login`, and `/logout` to the Express backend.

### Tests

```bash
npm test             # Run all backend tests
npm run test:watch   # Watch mode
npm run test:coverage # Coverage report
```

## Architecture

| Service | Purpose |
|---------|---------|
| `app` | Motion recorder + Express API + React UI + SQLite DB + storage |

### Tech Stack

- **Backend**: Node.js + Express + TypeScript (ESM)
- **Database**: SQLite via [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) (WAL mode, FTS5 full-text search)
- **Frontend**: React + Vite + TypeScript
- **Storage**: Local filesystem or S3-compatible
- **Integration**: MQTT for Home Assistant, OpenAI-compatible API for AI descriptions
- **Container**: Docker Alpine + FFmpeg
- **Tests**: Vitest

## Configuration

All settings are configurable from the web UI under the Settings tab:

- **Recording Duration** -- how long to record after motion is detected (default: 120s)
- **Cooldown** -- minimum time between recordings per camera (default: 20s)
- **Retention** -- how many days to keep recordings (default: 30, 0 = forever)

Per-camera overrides are available on the Cameras tab.

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `UI_PASSWORD` | _(empty)_ | Password-protect the web UI |
| `STORAGE_BACKEND` | `local` | `local` or `s3` |
| `MQTT_ENABLED` | `false` | Enable MQTT event publishing |
| `MQTT_BROKER` | | MQTT broker URL (e.g. `mqtt://emqx:1883`) |
| `AI_ENABLED` | `false` | Enable AI snapshot descriptions |
| `AI_API_URL` | | OpenAI-compatible API base URL |
| `AI_API_KEY` | _(empty)_ | API key (optional for local models) |
| `AI_MODEL` | `gpt-4o` | Vision model to use |

See `.env.example` for the full list including S3 and MQTT topic options.

## Credits

Forked from [samescolas/ding-dong-ditch](https://github.com/samescolas/ding-dong-ditch).

## Why?

Because fuck Amazon and fuck a surveillance state. :)

## License
MIT
