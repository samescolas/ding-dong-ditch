# DingDongDitch

Self-hosted Ring camera motion recorder with flexible storage backends.

Records video clips when your Ring cameras detect motion, stores them locally or in S3-compatible storage.

## Features

- **Motion-triggered recording** -- automatically records when Ring cameras detect motion or doorbell presses
- **Web UI** -- configure which cameras to monitor, recording duration, cooldown, and retention
- **Ring login** -- sign in with email/password + 2FA directly from the web UI
- **Storage backends** -- local/NFS (default, zero config) or S3-compatible (AWS, MinIO, Backblaze B2, Cloudflare R2)
- **Cloudflare Tunnel** -- optional remote access without port forwarding
- **Password protection** -- optional password gate on the management UI
- **Auto-cleanup** -- configurable retention period to prevent disk from filling up

## Quick Start

```bash
git clone https://github.com/youruser/dingdongditch.git
cd dingdongditch
cp .env.example .env
# Edit .env with your settings
docker compose up -d
```

- **Ring UI**: http://localhost:4280

## Setup

### 1. Configure `.env`

```bash
cp .env.example .env
```

Edit `.env` and set:
- `UI_PASSWORD` -- password for the Ring management UI (recommended if exposed to the internet)

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

## Remote Access (Cloudflare Tunnel)

To access the Ring UI from outside your network without port forwarding:

1. Buy or transfer a domain to [Cloudflare](https://dash.cloudflare.com)
2. Go to [Zero Trust](https://one.dash.cloudflare.com) > Networks > Tunnels > Create a tunnel
3. Add a public hostname: `ring.yourdomain.com` -> `http://app:3000`
4. Copy the tunnel token and add to `.env`:

```bash
CLOUDFLARE_TUNNEL_TOKEN=your-token-here
```

5. Start with the tunnel profile:

```bash
docker compose --profile tunnel up -d
```

## Architecture

| Service | Purpose |
|---------|---------|
| `app` | Motion recorder + Express API + web UI + storage |
| `cloudflared` | Optional Cloudflare Tunnel (requires `--profile tunnel`) |

## Configuration

All settings are configurable from the web UI under the Settings tab:

- **Recording Duration** -- how long to record after motion is detected (default: 120s)
- **Cooldown** -- minimum time between recordings per camera (default: 20s)
- **Retention** -- how many days to keep recordings (default: 30, 0 = forever)

Per-camera overrides are available on the Cameras tab.

## Why?

Because fuck Amazon and fuck a surveillance state. :)

https://buymeacoffee.com/samescolas

## License
MIT
