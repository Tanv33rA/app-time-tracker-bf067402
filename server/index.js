import express from "express";
import cors from "cors";
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const dataDir = path.join(rootDir, "server", "data");
const dbPath = path.join(dataDir, "devtrack.db");

fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(dbPath);

function normalizeAppName(name) {
  return String(name).trim().toLowerCase().replace(/\s+/g, " ");
}

function appIdFromName(name) {
  const normalized = normalizeAppName(name);
  const slug = normalized.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return `app-${slug || "untitled"}`;
}

function uid() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function createSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS developers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      normalized_name TEXT NOT NULL UNIQUE,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS apps (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      normalized_name TEXT NOT NULL UNIQUE,
      platform TEXT NOT NULL,
      developer TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      completed_at INTEGER,
      sessions_json TEXT NOT NULL,
      activity_json TEXT NOT NULL
    );
  `);
}

function developerIdFromName(name) {
  const normalized = normalizeAppName(name);
  const slug = normalized.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return `dev-${slug || "unknown"}`;
}

function ensureDeveloperByName(name) {
  const cleanName = String(name).trim();
  const normalized = normalizeAppName(cleanName);
  const existing = db.prepare("SELECT id, name FROM developers WHERE normalized_name = ?").get(normalized);
  if (existing) return existing;

  const created = {
    id: developerIdFromName(cleanName),
    name: cleanName,
    normalized_name: normalized,
    created_at: Date.now(),
  };
  db.prepare(
    "INSERT INTO developers (id, name, normalized_name, created_at) VALUES (@id, @name, @normalized_name, @created_at)"
  ).run(created);
  return { id: created.id, name: created.name };
}

function getDevelopers() {
  return db.prepare("SELECT id, name FROM developers ORDER BY name ASC").all();
}

function parseRow(row) {
  return {
    id: row.id,
    name: row.name,
    platform: row.platform,
    developer: row.developer,
    status: row.status,
    createdAt: row.created_at,
    completedAt: row.completed_at,
    sessions: JSON.parse(row.sessions_json),
    activity: JSON.parse(row.activity_json),
  };
}

function getApps() {
  return db
    .prepare("SELECT * FROM apps ORDER BY created_at DESC")
    .all()
    .map(parseRow);
}

function insertApp(app) {
  ensureDeveloperByName(app.developer);
  db.prepare(
    `INSERT INTO apps
    (id, name, normalized_name, platform, developer, status, created_at, completed_at, sessions_json, activity_json)
    VALUES
    (@id, @name, @normalized_name, @platform, @developer, @status, @created_at, @completed_at, @sessions_json, @activity_json)`
  ).run({
    id: app.id,
    name: app.name,
    normalized_name: normalizeAppName(app.name),
    platform: app.platform,
    developer: app.developer,
    status: app.status,
    created_at: app.createdAt,
    completed_at: app.completedAt,
    sessions_json: JSON.stringify(app.sessions),
    activity_json: JSON.stringify(app.activity),
  });
}

function updateApp(app) {
  db.prepare(
    `UPDATE apps SET
      name = @name,
      normalized_name = @normalized_name,
      platform = @platform,
      developer = @developer,
      status = @status,
      created_at = @created_at,
      completed_at = @completed_at,
      sessions_json = @sessions_json,
      activity_json = @activity_json
    WHERE id = @id`
  ).run({
    id: app.id,
    name: app.name,
    normalized_name: normalizeAppName(app.name),
    platform: app.platform,
    developer: app.developer,
    status: app.status,
    created_at: app.createdAt,
    completed_at: app.completedAt,
    sessions_json: JSON.stringify(app.sessions),
    activity_json: JSON.stringify(app.activity),
  });
}

function findAppById(id) {
  const row = db.prepare("SELECT * FROM apps WHERE id = ?").get(id);
  return row ? parseRow(row) : null;
}

function seedIfEmpty() {
  const countRow = db.prepare("SELECT COUNT(*) as count FROM apps").get();
  if (countRow.count > 0) return;

  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const mk = (name, platform, developer, daysAgo, status, completedDaysAgo) => {
    const createdAt = now - daysAgo * day;
    const completedAt =
      status === "Completed" && completedDaysAgo != null ? now - completedDaysAgo * day : null;
    const sessionEnd = status === "Active" ? null : completedAt ?? now - 1 * day;
    return {
      id: appIdFromName(name),
      name,
      platform,
      developer,
      status,
      createdAt,
      completedAt,
      sessions: [{ id: uid(), start: createdAt, end: sessionEnd }],
      activity: [
        { id: uid(), type: "created", at: createdAt },
        ...(status === "Paused" ? [{ id: uid(), type: "paused", at: sessionEnd ?? now }] : []),
        ...(status === "Completed" && completedAt
          ? [{ id: uid(), type: "completed", at: completedAt }]
          : []),
      ],
    };
  };

  const seed = [
    mk("Aurora Wallet", "iOS", "Maya Chen", 22, "Active"),
    mk("Pulse Fitness", "Android", "Daniel Park", 14, "Active"),
    mk("Lumen Notes", "Web", "Sara Ali", 40, "Completed", 5),
    mk("Nimbus Chat", "iOS", "Daniel Park", 9, "Paused"),
    mk("Forge Analytics", "Web", "Maya Chen", 60, "Completed", 12),
    mk("Tide Travel", "Android", "Jonas Weber", 4, "Active"),
  ];

  seed.forEach(insertApp);
}

function backfillDevelopersFromApps() {
  const names = db.prepare("SELECT DISTINCT developer FROM apps").all();
  names.forEach((row) => ensureDeveloperByName(row.developer));
}

createSchema();
seedIfEmpty();
backfillDevelopersFromApps();

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, dbPath });
});

app.get("/api/apps", (_req, res) => {
  res.json(getApps());
});

app.get("/api/developers", (_req, res) => {
  res.json(getDevelopers());
});

app.post("/api/developers", (req, res) => {
  const name = String(req.body?.name ?? "").trim();
  if (!name) return res.status(400).json({ message: "Developer name is required" });
  if (name.length > 60) return res.status(400).json({ message: "Developer name max length is 60" });

  const normalized = normalizeAppName(name);
  const existing = db.prepare("SELECT id, name FROM developers WHERE normalized_name = ?").get(normalized);
  if (existing) {
    return res.status(409).json({ message: "A developer with this name already exists" });
  }

  const record = {
    id: developerIdFromName(name),
    name,
    normalized_name: normalized,
    created_at: Date.now(),
  };
  db.prepare(
    "INSERT INTO developers (id, name, normalized_name, created_at) VALUES (@id, @name, @normalized_name, @created_at)"
  ).run(record);
  return res.status(201).json({ id: record.id, name: record.name });
});

app.post("/api/apps", (req, res) => {
  const name = String(req.body?.name ?? "").trim();
  const developer = String(req.body?.developer ?? "").trim();
  const platform = String(req.body?.platform ?? "").trim();

  if (!name || !developer || !["iOS", "Android", "Web"].includes(platform)) {
    return res.status(400).json({ message: "Invalid app payload" });
  }

  const normalizedName = normalizeAppName(name);
  const existing = db.prepare("SELECT id FROM apps WHERE normalized_name = ?").get(normalizedName);
  if (existing) {
    return res.status(409).json({ message: "An app with this name already exists" });
  }

  const devExists = db
    .prepare("SELECT id FROM developers WHERE normalized_name = ?")
    .get(normalizeAppName(developer));
  if (!devExists) {
    return res.status(400).json({ message: "Selected developer does not exist" });
  }

  const now = Date.now();
  const appItem = {
    id: appIdFromName(name),
    name,
    platform,
    developer,
    status: "Active",
    createdAt: now,
    completedAt: null,
    sessions: [{ id: uid(), start: now, end: null }],
    activity: [{ id: uid(), type: "created", at: now }],
  };
  insertApp(appItem);
  return res.status(201).json(appItem);
});

function updateStatus(id, handler, res) {
  const current = findAppById(id);
  if (!current) return res.status(404).json({ message: "App not found" });
  const next = handler(current);
  if (!next) return res.status(400).json({ message: "Invalid status transition" });
  updateApp(next);
  return res.json(next);
}

app.post("/api/apps/:id/pause", (req, res) =>
  updateStatus(
    req.params.id,
    (appItem) => {
      if (appItem.status !== "Active") return null;
      const now = Date.now();
      return {
        ...appItem,
        status: "Paused",
        sessions: appItem.sessions.map((s) => (s.end == null ? { ...s, end: now } : s)),
        activity: [...appItem.activity, { id: uid(), type: "paused", at: now }],
      };
    },
    res
  )
);

app.post("/api/apps/:id/resume", (req, res) =>
  updateStatus(
    req.params.id,
    (appItem) => {
      if (appItem.status !== "Paused") return null;
      const now = Date.now();
      return {
        ...appItem,
        status: "Active",
        sessions: [...appItem.sessions, { id: uid(), start: now, end: null }],
        activity: [...appItem.activity, { id: uid(), type: "resumed", at: now }],
      };
    },
    res
  )
);

app.post("/api/apps/:id/complete", (req, res) =>
  updateStatus(
    req.params.id,
    (appItem) => {
      if (appItem.status === "Completed") return null;
      const now = Date.now();
      return {
        ...appItem,
        status: "Completed",
        completedAt: now,
        sessions: appItem.sessions.map((s) => (s.end == null ? { ...s, end: now } : s)),
        activity: [...appItem.activity, { id: uid(), type: "completed", at: now }],
      };
    },
    res
  )
);

app.post("/api/apps/:id/reopen", (req, res) =>
  updateStatus(
    req.params.id,
    (appItem) => {
      if (appItem.status !== "Completed") return null;
      const now = Date.now();
      return {
        ...appItem,
        status: "Active",
        completedAt: null,
        sessions: [...appItem.sessions, { id: uid(), start: now, end: null }],
        activity: [...appItem.activity, { id: uid(), type: "reopened", at: now }],
      };
    },
    res
  )
);

app.delete("/api/apps/:id", (req, res) => {
  const result = db.prepare("DELETE FROM apps WHERE id = ?").run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ message: "App not found" });
  return res.status(204).send();
});

const port = Number(process.env.API_PORT || 3001);
app.listen(port, () => {
  console.log(`Devtrack API running on http://localhost:${port}`);
  console.log(`SQLite DB: ${dbPath}`);
});
