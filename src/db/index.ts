import Database from "better-sqlite3"
import { join } from "node:path"
import { homedir } from "node:os"
import { existsSync, mkdirSync, copyFileSync, readdirSync, unlinkSync } from "node:fs"
import { CREATE_TABLES_SQL, SCHEMA_VERSION } from "./schema"

let db: Database.Database | null = null

export function getDbPath(): string {
  const dir = join(homedir(), ".opencode-web")
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  return join(dir, "data.db")
}

function backupDatabase(dbPath: string): void {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
  const backupPath = join(join(dbPath, ".."), `data-backup-${timestamp}.db`)
  copyFileSync(dbPath, backupPath)
  console.log(`Database backed up to: ${backupPath}`)
  
  const dir = join(dbPath, "..")
  const backups = readdirSync(dir)
    .filter(f => f.startsWith("data-backup-") && f.endsWith(".db"))
    .sort()
  
  while (backups.length > 5) {
    const oldBackup = backups.shift()
    if (oldBackup) {
      unlinkSync(join(dir, oldBackup))
      console.log(`Removed old backup: ${oldBackup}`)
    }
  }
}

export function initDb(): Database.Database {
  if (!db) {
    const dbPath = getDbPath()
    db = new Database(dbPath)
    db.pragma("foreign_keys = ON")
    
    const tableInfo = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='group_members'").get() as { sql: string } | undefined
    
    if (tableInfo && !tableInfo.sql.includes("id TEXT PRIMARY KEY")) {
      console.log("Migrating database schema...")
      backupDatabase(dbPath)
      db.exec("DROP TABLE IF EXISTS group_members")
    }
    
    db.exec(CREATE_TABLES_SQL)
    
    // Add bubble_color column if not exists
    try { db.exec("ALTER TABLE group_members ADD COLUMN bubble_color TEXT DEFAULT '#0096ff'") } catch {}
    
    // Add session_initialized column if not exists
    try { db.exec("ALTER TABLE group_members ADD COLUMN session_initialized INTEGER NOT NULL DEFAULT 0") } catch {}
    
    const row = db.prepare("SELECT version FROM schema_version").get() as { version: number } | undefined
    if (!row) {
      db.prepare("INSERT INTO schema_version (version) VALUES (?)").run(SCHEMA_VERSION)
    } else if (row.version < SCHEMA_VERSION) {
      db.prepare("UPDATE schema_version SET version = ?").run(SCHEMA_VERSION)
    }
  }
  return db
}

export function getDb(): Database.Database {
  return db ?? initDb()
}

export function closeDb(): void {
  if (db) {
    db.close()
    db = null
  }
}
