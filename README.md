# DingDongDitch

Self-hosted Ring camera motion recorder with Nextcloud integration.

Records video clips when your Ring cameras detect motion, stores them locally, and syncs them to a Nextcloud instance for easy access from any device.

## Features

- **Motion-triggered recording** -- automatically records when Ring cameras detect motion or doorbell presses
- **Web UI** -- configure which cameras to monitor, recording duration, cooldown, and retention
- **Ring login** -- sign in with email/password + 2FA directly from the web UI
- **Nextcloud integration** -- recordings appear in Nextcloud via external storage, accessible from the Nextcloud mobile app
- **Cloudflare Tunnel** -- optional remote access without port forwarding
- **Password protection** -- optional password gate on the management UI
- **Auto-cleanup** -- configurable retention period to prevent disk from filling up

## Quick Start

```bash
git clone https://github.com/youruser/dingdongditch.git
cd dingdongditch
cp .env.example .env
# Edit .env with your passwords
docker compose up -d
```

- **Ring UI**: http://localhost:4280
- **Nextcloud**: http://localhost:5280

## Setup

### 1. Configure `.env`

```bash
cp .env.example .env
```

Edit `.env` and set at minimum:
- `POSTGRES_PASSWORD` -- database password
- `NEXTCLOUD_ADMIN_PASSWORD` -- Nextcloud admin password
- `UI_PASSWORD` -- password for the Ring management UI (recommended if exposed to the internet)

### 2. Start the services

```bash
docker compose up -d
```

### 3. Connect your Ring account

Open http://localhost:4280 and sign in with your Ring email and password. You'll be prompted for a 2FA code if enabled on your account.

### 4. Configure cameras

Switch to the Cameras tab to enable/disable monitoring per camera and adjust recording duration and cooldown.

## Remote Access (Cloudflare Tunnel)

To access Nextcloud and the Ring UI from outside your network without port forwarding:

1. Buy or transfer a domain to [Cloudflare](https://dash.cloudflare.com)
2. Go to [Zero Trust](https://one.dash.cloudflare.com) > Networks > Tunnels > Create a tunnel
3. Add two public hostnames on the same tunnel:
   - `nextcloud.yourdomain.com` -> `http://nextcloud:80`
   - `ring.yourdomain.com` -> `http://ring-service:3000`
4. Copy the tunnel token and add to `.env`:

```bash
CLOUDFLARE_TUNNEL_TOKEN=your-token-here
NEXTCLOUD_DOMAIN=nextcloud.yourdomain.com
NEXTCLOUD_TRUSTED_DOMAINS=localhost nextcloud.yourdomain.com
```

5. Start with the tunnel profile:

```bash
docker compose --profile tunnel up -d
```

## Architecture

| Service | Purpose |
|---------|---------|
| `ring-service` | Motion recorder + Express API + web UI |
| `nextcloud` | File storage and mobile access |
| `db` | PostgreSQL database for Nextcloud |
| `nextcloud-setup` | One-shot container to configure external storage |
| `nextcloud-cron` | Periodic file scanner for new recordings |
| `cloudflared` | Optional Cloudflare Tunnel (requires `--profile tunnel`) |

Recordings are saved to a shared Docker volume at `/recordings/YYYY-MM-DD/Camera_Name/HH-MM-SS.mp4`, accessible from both the Ring UI and Nextcloud.

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
