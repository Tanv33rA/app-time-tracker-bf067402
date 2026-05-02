# DevTrack

**DevTrack** is an app development progress tracker: a React dashboard plus a small Node API and SQLite database. Use it to track apps (iOS / Android), assigned developers, task cycles, status, and time spent—without full project-management overhead.

---

# 🚀 DevTrack Deployment Guide (Windows Server)

This project is deployed on Windows Server using:

* **Node.js + Express** (API)
* **React + Vite** (Frontend build in `dist`)
* **SQLite** (local database)
* **Caddy** (reverse proxy + static server)
* **NSSM** (Windows services)

---

# 📁 Project Location

```
C:\apps\app-time-tracker-bf067402
```

---

# ⚙️ Services

Managed using **NSSM**:

| Service     | Purpose                          |
| ----------- | -------------------------------- |
| DevtrackApi | Runs Node backend                |
| Caddy       | Serves frontend + proxies `/api` |

---

# 🌐 URLs

* App: http://YOUR_SERVER_IP
* API Health: http://YOUR_SERVER_IP/api/health

---

# 🔄 Update / Deploy Changes

## ✅ Standard update flow

```powershell
# 1. Stop backend (IMPORTANT)
nssm stop DevtrackApi

# 2. Pull latest code
git pull

# 3. Install dependencies
npm ci

# 4. Build frontend
npm run build

# 5. Start backend
nssm start DevtrackApi
```

👉 No need to restart Caddy unless config changes

---

# 🔁 Useful Commands

## Check service status

```powershell
nssm status DevtrackApi
nssm status Caddy
```

## Restart services

```powershell
nssm restart DevtrackApi
nssm restart Caddy
```

## Stop services

```powershell
nssm stop DevtrackApi
nssm stop Caddy
```

---

# 🗄️ Database

SQLite file location:

```
C:\apps\app-time-tracker-bf067402\server\data\devtrack.db
```

## ⚠️ Backup this file regularly

---

# 🌍 Caddy Configuration

File:

```
C:\caddy\Caddyfile
```

## Example config:

```
:80 {

    handle /api/* {
        reverse_proxy 127.0.0.1:3001
    }

    handle {
        root * C:\apps\app-time-tracker-bf067402\dist
        try_files {path} /index.html
        file_server
    }
}
```

---

# 🧠 Important Notes

### ✅ Always stop API before updating

* Prevents file lock issues (`EPERM`)
* Especially important for `better-sqlite3`

---

### ❌ Do NOT deploy inside:

```
C:\Users\...
```

✔ Always use:

```
C:\apps\
```

---

### 🔄 When to restart what

| Change           | Action               |
| ---------------- | -------------------- |
| Frontend (React) | `npm run build` only |
| Backend (Node)   | Restart DevtrackApi  |
| Caddyfile        | Restart Caddy        |

---

# 🐞 Troubleshooting

## API not working

```powershell
nssm status DevtrackApi
```

## Caddy issues

```powershell
nssm status Caddy
```

## Port check

```powershell
netstat -ano | findstr :80
netstat -ano | findstr :3001
```

---

# 🚀 Architecture

```
Browser → Caddy (port 80)
              ├── serves React (dist)
              └── /api → Node (port 3001)
                          └── SQLite DB
```

---

# 🔐 Future Improvements

* Add domain + HTTPS (Caddy auto SSL)
* Automate DB backups
* Add monitoring/logging

---

# ✅ Status

Production-ready Windows deployment using services.
No manual PowerShell required after setup.

---
