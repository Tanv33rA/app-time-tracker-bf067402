# App Time Tracker

- React + Vite frontend
- Node.js + Express API
- SQLite at `server/data/devtrack.db`

The UI calls `/api/...` (relative URLs). In production you must serve the built `dist` folder **and** reverse-proxy `/api` to the Node API.

---

## Deploy on Windows Server (no Docker)

### 1. Prerequisites

- [Node.js](https://nodejs.org/) LTS (20 or 22)
- Git (to clone the repo)
- [NSSM](https://nssm.cc/) — run the API as a Windows service
- **Caddy** or **IIS** — serve static files + proxy `/api` to the API

### 2. Clone and build

```powershell
cd C:\apps
git clone <YOUR_REPO_URL> app-time-tracker
cd app-time-tracker
npm ci
npm run build
```

Confirm `dist` exists.

### 3. Run the API with NSSM

The API must start with **working directory = repo root** so `server/data` resolves correctly.

Example paths — change to match your server:

- Repo: `C:\apps\app-time-tracker`
- Node: `C:\Program Files\nodejs\node.exe`

Install the service:

```powershell
nssm install DevtrackApi "C:\Program Files\nodejs\node.exe" "C:\apps\app-time-tracker\server\index.js"
nssm set DevtrackApi AppDirectory "C:\apps\app-time-tracker"
nssm set DevtrackApi AppEnvironmentExtra "API_PORT=3001"
nssm start DevtrackApi
```

Verify on the server: open `http://127.0.0.1:3001/api/health` — you should see JSON with `"ok": true`.

Keep port **3001** bound to localhost only in production; users should hit **80/443** through the reverse proxy.

### 4. Reverse proxy

#### Option A — Caddy (simple)

Install [Caddy for Windows](https://caddyserver.com/docs/install#windows). Example `Caddyfile` (adjust domain and paths):

```caddy
your-domain.com {
    root * C:\apps\app-time-tracker\dist
    file_server
    try_files {path} /index.html

    handle_path /api/* {
        reverse_proxy 127.0.0.1:3001
    }
}
```

Run Caddy as a service or scheduled task. Point DNS **A** record to the server. Allow **80** and **443** in Windows Firewall and your host’s panel.

#### Option B — IIS

1. Install IIS with static content.
2. Install **URL Rewrite** and **Application Request Routing (ARR)**; in ARR, enable **proxy**.
3. Site physical path = your `dist` folder.
4. Add rules so `/api/*` is reverse-proxied to `http://127.0.0.1:3001/api/...`.
5. Add a SPA fallback rule so client-side routes serve `index.html`.

### 5. Firewall

Allow inbound **TCP 80** (and **443** for HTTPS). Do not expose **3001** publicly if the proxy handles API traffic.

### 6. Data and backups

SQLite file: `server/data/devtrack.db`. Back up this file regularly.

### 7. Updates

```powershell
cd C:\apps\app-time-tracker
git pull
npm ci
npm run build
Restart-Service DevtrackApi
```

Reload Caddy or recycle IIS as needed.
