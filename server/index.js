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
      created_at INTEGER NOT NULL,
      is_archived INTEGER NOT NULL DEFAULT 0
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
      activity_json TEXT NOT NULL,
      current_task_id TEXT
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      app_id TEXT NOT NULL,
      task_type TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      completed_at INTEGER,
      FOREIGN KEY (app_id) REFERENCES apps(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS task_assignments (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      developer_id TEXT NOT NULL,
      assigned_at INTEGER NOT NULL,
      unassigned_at INTEGER,
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
      FOREIGN KEY (developer_id) REFERENCES developers(id)
    );

    CREATE TABLE IF NOT EXISTS work_sessions (
      id TEXT PRIMARY KEY,
      app_id TEXT NOT NULL,
      task_id TEXT NOT NULL,
      developer_id TEXT NOT NULL,
      start_at INTEGER NOT NULL,
      end_at INTEGER,
      FOREIGN KEY (app_id) REFERENCES apps(id) ON DELETE CASCADE,
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
      FOREIGN KEY (developer_id) REFERENCES developers(id)
    );

    CREATE TABLE IF NOT EXISTS activity_events (
      id TEXT PRIMARY KEY,
      app_id TEXT NOT NULL,
      task_id TEXT,
      type TEXT NOT NULL,
      at INTEGER NOT NULL,
      note TEXT,
      meta_json TEXT,
      FOREIGN KEY (app_id) REFERENCES apps(id) ON DELETE CASCADE,
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL
    );
  `);

  const appColumns = db.prepare("PRAGMA table_info(apps)").all().map((c) => c.name);
  if (!appColumns.includes("current_task_id")) {
    db.exec("ALTER TABLE apps ADD COLUMN current_task_id TEXT");
  }
  const developerColumns = db.prepare("PRAGMA table_info(developers)").all().map((c) => c.name);
  if (!developerColumns.includes("is_archived")) {
    db.exec("ALTER TABLE developers ADD COLUMN is_archived INTEGER NOT NULL DEFAULT 0");
  }
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
  return db
    .prepare("SELECT id, name FROM developers WHERE is_archived = 0 ORDER BY name ASC")
    .all();
}

function parseJsonArray(text) {
  try {
    const parsed = JSON.parse(text ?? "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function addActivity(appId, taskId, type, at, note, meta) {
  db.prepare(
    `INSERT INTO activity_events (id, app_id, task_id, type, at, note, meta_json)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(uid(), appId, taskId ?? null, type, at, note ?? null, meta ? JSON.stringify(meta) : null);
}

function closeOpenSession(appId, now) {
  db.prepare("UPDATE work_sessions SET end_at = ? WHERE app_id = ? AND end_at IS NULL").run(now, appId);
}

function getCurrentTask(appId) {
  return db
    .prepare(
      `SELECT * FROM tasks
       WHERE app_id = ?
       ORDER BY created_at DESC
       LIMIT 1`
    )
    .get(appId);
}

function getCurrentAssignment(taskId) {
  if (!taskId) return null;
  return db
    .prepare(
      `SELECT ta.*, d.name as developer_name
       FROM task_assignments ta
       JOIN developers d ON d.id = ta.developer_id
       WHERE ta.task_id = ? AND ta.unassigned_at IS NULL
       ORDER BY ta.assigned_at DESC
       LIMIT 1`
    )
    .get(taskId);
}

function serializeApp(appRow) {
  const tasks = db
    .prepare("SELECT * FROM tasks WHERE app_id = ? ORDER BY created_at DESC")
    .all(appRow.id);
  const currentTask = tasks[0] ?? null;
  const assignment = currentTask ? getCurrentAssignment(currentTask.id) : null;
  const sessions = db
    .prepare(
      `SELECT ws.id, ws.start_at, ws.end_at, d.name as developer_name, t.task_type
       FROM work_sessions ws
       JOIN developers d ON d.id = ws.developer_id
       JOIN tasks t ON t.id = ws.task_id
       WHERE ws.app_id = ?
       ORDER BY ws.start_at ASC`
    )
    .all(appRow.id)
    .map((s) => ({
      id: s.id,
      start: s.start_at,
      end: s.end_at,
      developer: s.developer_name,
      taskType: s.task_type,
    }));
  const activity = db
    .prepare(
      `SELECT ae.*, t.task_type
       FROM activity_events ae
       LEFT JOIN tasks t ON t.id = ae.task_id
       WHERE ae.app_id = ?
       ORDER BY ae.at ASC`
    )
    .all(appRow.id)
    .map((ev) => {
      const meta = ev.meta_json ? JSON.parse(ev.meta_json) : null;
      return {
        id: ev.id,
        type: ev.type,
        at: ev.at,
        note: ev.note ?? undefined,
        taskType: ev.task_type ?? meta?.taskType,
        developer: meta?.developer,
      };
    });
  return {
    id: appRow.id,
    name: appRow.name,
    platform: appRow.platform,
    developer: assignment?.developer_name ?? appRow.developer,
    taskType: currentTask?.task_type ?? "Task",
    status: appRow.status,
    createdAt: appRow.created_at,
    completedAt: appRow.completed_at,
    sessions,
    activity,
  };
}

function getApps() {
  return db.prepare("SELECT * FROM apps ORDER BY created_at DESC").all().map(serializeApp);
}

function insertApp(app) {
  const dev = ensureDeveloperByName(app.developer);
  db.prepare(
    `INSERT INTO apps
    (id, name, normalized_name, platform, developer, status, created_at, completed_at, sessions_json, activity_json, current_task_id)
    VALUES
    (@id, @name, @normalized_name, @platform, @developer, @status, @created_at, @completed_at, @sessions_json, @activity_json, @current_task_id)`
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
    current_task_id: null,
  });

  const taskId = uid();
  db.prepare(
    "INSERT INTO tasks (id, app_id, task_type, status, created_at, completed_at) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(taskId, app.id, app.taskType, app.status, app.createdAt, app.completedAt);
  db.prepare(
    "INSERT INTO task_assignments (id, task_id, developer_id, assigned_at, unassigned_at) VALUES (?, ?, ?, ?, NULL)"
  ).run(uid(), taskId, dev.id, app.createdAt);
  app.sessions.forEach((s) => {
    db.prepare(
      "INSERT INTO work_sessions (id, app_id, task_id, developer_id, start_at, end_at) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(s.id, app.id, taskId, dev.id, s.start, s.end);
  });
  app.activity.forEach((ev) => addActivity(app.id, taskId, ev.type, ev.at, ev.note, { developer: dev.name }));
  db.prepare("UPDATE apps SET current_task_id = ? WHERE id = ?").run(taskId, app.id);
}

function findAppById(id) {
  const row = db.prepare("SELECT * FROM apps WHERE id = ?").get(id);
  return row ? serializeApp(row) : null;
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
      taskType: "First Release",
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

function migrateLegacyToNormalized() {
  const taskCount = db.prepare("SELECT COUNT(*) as count FROM tasks").get().count;
  if (taskCount > 0) return;

  const apps = db.prepare("SELECT * FROM apps ORDER BY created_at ASC").all();
  const tx = db.transaction(() => {
    apps.forEach((appRow) => {
      const dev = ensureDeveloperByName(appRow.developer);
      const taskId = uid();
      const createdAt = appRow.created_at;
      const completedAt = appRow.completed_at;
      db.prepare(
        "INSERT INTO tasks (id, app_id, task_type, status, created_at, completed_at) VALUES (?, ?, ?, ?, ?, ?)"
      ).run(taskId, appRow.id, "First Release", appRow.status, createdAt, completedAt);
      db.prepare(
        "INSERT INTO task_assignments (id, task_id, developer_id, assigned_at, unassigned_at) VALUES (?, ?, ?, ?, ?)"
      ).run(uid(), taskId, dev.id, createdAt, completedAt ?? null);
      parseJsonArray(appRow.sessions_json).forEach((s) => {
        db.prepare(
          "INSERT INTO work_sessions (id, app_id, task_id, developer_id, start_at, end_at) VALUES (?, ?, ?, ?, ?, ?)"
        ).run(s.id ?? uid(), appRow.id, taskId, dev.id, Number(s.start || createdAt), s.end ?? null);
      });
      parseJsonArray(appRow.activity_json).forEach((ev) => {
        addActivity(
          appRow.id,
          taskId,
          ev.type ?? "created",
          Number(ev.at || createdAt),
          ev.note ?? null,
          { developer: dev.name, taskType: "First Release" }
        );
      });
      db.prepare("UPDATE apps SET current_task_id = ? WHERE id = ?").run(taskId, appRow.id);
    });
  });
  tx();
}

createSchema();
backfillDevelopersFromApps();
migrateLegacyToNormalized();

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
  const existing = db
    .prepare("SELECT id, name, is_archived FROM developers WHERE normalized_name = ?")
    .get(normalized);
  if (existing) {
    if (existing.is_archived) {
      db.prepare("UPDATE developers SET is_archived = 0 WHERE id = ?").run(existing.id);
      return res.status(200).json({ id: existing.id, name: existing.name });
    }
    return res.status(409).json({ message: "A developer with this name already exists" });
  }

  const record = {
    id: developerIdFromName(name),
    name,
    normalized_name: normalized,
    created_at: Date.now(),
    is_archived: 0,
  };
  db.prepare(
    "INSERT INTO developers (id, name, normalized_name, created_at, is_archived) VALUES (@id, @name, @normalized_name, @created_at, @is_archived)"
  ).run(record);
  return res.status(201).json({ id: record.id, name: record.name });
});

app.delete("/api/developers/:id", (req, res) => {
  const result = db
    .prepare("UPDATE developers SET is_archived = 1 WHERE id = ? AND is_archived = 0")
    .run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ message: "Developer not found" });
  return res.status(204).send();
});

app.post("/api/apps", (req, res) => {
  const name = String(req.body?.name ?? "").trim();
  const developer = String(req.body?.developer ?? "").trim();
  const platform = String(req.body?.platform ?? "").trim();
  const taskType = String(req.body?.taskType ?? "").trim();

  if (!name || !developer || !taskType || !["iOS", "Android"].includes(platform)) {
    return res.status(400).json({ message: "Invalid app payload" });
  }

  const normalizedName = normalizeAppName(name);
  const existing = db.prepare("SELECT id FROM apps WHERE normalized_name = ?").get(normalizedName);
  if (existing) {
    return res.status(409).json({ message: "An app with this name already exists" });
  }

  const devExists = db
    .prepare("SELECT id FROM developers WHERE normalized_name = ? AND is_archived = 0")
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
    taskType,
    sessions: [{ id: uid(), start: now, end: null }],
    activity: [{ id: uid(), type: "created", at: now, taskType, developer }],
  };
  insertApp(appItem);
  return res.status(201).json(findAppById(appItem.id));
});

function withAppMutation(appId, res, fn) {
  const appRow = db.prepare("SELECT * FROM apps WHERE id = ?").get(appId);
  if (!appRow) return res.status(404).json({ message: "App not found" });
  try {
    const tx = db.transaction(() => fn(appRow));
    tx();
    return res.json(findAppById(appId));
  } catch (error) {
    return res
      .status(400)
      .json({ message: error instanceof Error ? error.message : "Invalid status transition" });
  }
}

app.post("/api/apps/:id/pause", (req, res) =>
  withAppMutation(req.params.id, res, (appRow) => {
    if (appRow.status !== "Active") throw new Error("Invalid status transition");
    const task = getCurrentTask(appRow.id);
    if (!task) throw new Error("No task found");
    const now = Date.now();
    closeOpenSession(appRow.id, now);
    db.prepare("UPDATE tasks SET status = ? WHERE id = ?").run("Paused", task.id);
    db.prepare("UPDATE apps SET status = ? WHERE id = ?").run("Paused", appRow.id);
    addActivity(appRow.id, task.id, "paused", now, null, null);
  })
);

app.post("/api/apps/:id/resume", (req, res) =>
  withAppMutation(req.params.id, res, (appRow) => {
    if (appRow.status !== "Paused") throw new Error("Invalid status transition");
    const task = getCurrentTask(appRow.id);
    if (!task) throw new Error("No task found");
    const assignment = getCurrentAssignment(task.id);
    if (!assignment) throw new Error("No active developer assignment");
    const now = Date.now();
    db.prepare(
      "INSERT INTO work_sessions (id, app_id, task_id, developer_id, start_at, end_at) VALUES (?, ?, ?, ?, ?, NULL)"
    ).run(uid(), appRow.id, task.id, assignment.developer_id, now);
    db.prepare("UPDATE tasks SET status = ?, completed_at = NULL WHERE id = ?").run("Active", task.id);
    db.prepare("UPDATE apps SET status = ?, completed_at = NULL, developer = ? WHERE id = ?").run(
      "Active",
      assignment.developer_name,
      appRow.id
    );
    addActivity(appRow.id, task.id, "resumed", now, null, { developer: assignment.developer_name });
  })
);

app.post("/api/apps/:id/complete", (req, res) =>
  withAppMutation(req.params.id, res, (appRow) => {
    if (appRow.status === "Completed") throw new Error("Invalid status transition");
    const task = getCurrentTask(appRow.id);
    if (!task) throw new Error("No task found");
    const now = Date.now();
    closeOpenSession(appRow.id, now);
    db.prepare("UPDATE tasks SET status = ?, completed_at = ? WHERE id = ?").run("Completed", now, task.id);
    db.prepare("UPDATE task_assignments SET unassigned_at = ? WHERE task_id = ? AND unassigned_at IS NULL").run(
      now,
      task.id
    );
    db.prepare("UPDATE apps SET status = ?, completed_at = ? WHERE id = ?").run("Completed", now, appRow.id);
    addActivity(appRow.id, task.id, "completed", now, null, null);
  })
);

app.post("/api/apps/:id/reopen", (req, res) =>
  withAppMutation(req.params.id, res, (appRow) => {
    if (appRow.status !== "Completed") throw new Error("Invalid status transition");
    const task = getCurrentTask(appRow.id);
    if (!task) throw new Error("No task found");
    let assignment = getCurrentAssignment(task.id);
    const now = Date.now();
    if (!assignment) {
      const currentDev = ensureDeveloperByName(appRow.developer);
      db.prepare(
        "INSERT INTO task_assignments (id, task_id, developer_id, assigned_at, unassigned_at) VALUES (?, ?, ?, ?, NULL)"
      ).run(uid(), task.id, currentDev.id, now);
      assignment = { developer_id: currentDev.id, developer_name: currentDev.name };
    }
    db.prepare(
      "INSERT INTO work_sessions (id, app_id, task_id, developer_id, start_at, end_at) VALUES (?, ?, ?, ?, ?, NULL)"
    ).run(uid(), appRow.id, task.id, assignment.developer_id, now);
    db.prepare("UPDATE tasks SET status = ?, completed_at = NULL WHERE id = ?").run("Active", task.id);
    db.prepare("UPDATE apps SET status = ?, completed_at = ?, developer = ? WHERE id = ?").run(
      "Active",
      null,
      assignment.developer_name,
      appRow.id
    );
    addActivity(appRow.id, task.id, "reopened", now, null, { developer: assignment.developer_name });
  })
);

app.post("/api/apps/:id/start-next-task", (req, res) =>
  withAppMutation(req.params.id, res, (appRow) => {
    const taskType = String(req.body?.taskType ?? "").trim();
    const developerName = String(req.body?.developer ?? "").trim();
    if (!taskType || !developerName) {
      throw new Error("Invalid next task payload");
    }
    if (appRow.status !== "Completed") {
      throw new Error("Current task must be completed before starting next task");
    }
    const devExists = db
      .prepare("SELECT id, name FROM developers WHERE normalized_name = ? AND is_archived = 0")
      .get(normalizeAppName(developerName));
    if (!devExists) throw new Error("Selected developer does not exist");
    const now = Date.now();
    const currentTask = getCurrentTask(appRow.id);
    if (!currentTask || currentTask.status !== "Completed") {
      throw new Error("Current task must be completed before starting next task");
    }

    const taskId = uid();
    db.prepare(
      "INSERT INTO tasks (id, app_id, task_type, status, created_at, completed_at) VALUES (?, ?, ?, ?, ?, NULL)"
    ).run(taskId, appRow.id, taskType, "Active", now);
    db.prepare(
      "INSERT INTO task_assignments (id, task_id, developer_id, assigned_at, unassigned_at) VALUES (?, ?, ?, ?, NULL)"
    ).run(uid(), taskId, devExists.id, now);
    db.prepare(
      "INSERT INTO work_sessions (id, app_id, task_id, developer_id, start_at, end_at) VALUES (?, ?, ?, ?, ?, NULL)"
    ).run(uid(), appRow.id, taskId, devExists.id, now);
    db.prepare(
      "UPDATE apps SET status = ?, completed_at = NULL, developer = ?, current_task_id = ? WHERE id = ?"
    ).run("Active", devExists.name, taskId, appRow.id);
    addActivity(appRow.id, taskId, "task_assigned", now, `Task set to ${taskType}`, {
      taskType,
      developer: devExists.name,
    });
    addActivity(appRow.id, taskId, "reopened", now, "Started next task cycle", {
      taskType,
      developer: devExists.name,
    });
  })
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
