# OpenCode Web - Agent 群聊界面实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 创建独立的 `opencode-web` 项目，提供群聊界面让开发者管理多个 agent 协作完成开发任务。

**Architecture:** Hono web server + React 前端，通过 OpenCode SDK 管理多个 agent session。每个群成员 agent 对应一个持久 session，通过 @mention 触发响应，支持中断机制。

**Tech Stack:** Hono, React, SQLite (better-sqlite3), WebSocket, OpenCode SDK, Vite, Bun

---

## 文件结构

```
opencode-web/
├── package.json
├── tsconfig.json
├── bunfig.toml
├── src/
│   ├── index.ts                  # 入口
│   ├── cli.ts                    # CLI 命令处理
│   ├── server.ts                 # Hono server
│   ├── types.ts                  # 共享类型
│   │
│   ├── api/
│   │   ├── index.ts              # API 路由注册
│   │   ├── groups.ts             # 群管理 API
│   │   ├── messages.ts           # 消息 API
│   │   └── agents.ts             # Agent 列表 API
│   │
│   ├── ws/
│   │   ├── index.ts              # WebSocket 路由
│   │   └── handler.ts            # WebSocket 消息处理
│   │
│   ├── db/
│   │   ├── index.ts              # 数据库入口
│   │   ├── schema.ts             # 表结构定义
│   │   └── queries.ts            # 查询函数
│   │
│   └── session/
│       ├── index.ts              # Session 管理入口
│       ├── manager.ts            # Session 创建/复用/中断
│       └── types.ts              # Session 类型
│
└── web-client/
    ├── package.json
    ├── vite.config.ts
    ├── tsconfig.json
    ├── index.html
    └── src/
        ├── main.tsx
        ├── App.tsx
        ├── App.css
        ├── types.ts
        ├── components/
        │   ├── GroupList.tsx
        │   ├── MessageList.tsx
        │   ├── MessageInput.tsx
        │   ├── AgentList.tsx
        │   └── CreateGroupModal.tsx
        └── hooks/
            ├── useWebSocket.ts
            └── useApi.ts
```

---

## Phase 1: 项目初始化

### Task 1: 项目基础结构

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `bunfig.toml`
- Create: `src/index.ts`
- Create: `src/cli.ts`

- [ ] **Step 1: 创建 package.json**

```json
{
  "name": "opencode-web",
  "version": "0.1.0",
  "type": "module",
  "bin": {
    "opencode-web": "./bin/cli.js"
  },
  "scripts": {
    "dev": "bun run src/index.ts",
    "build": "bun build src/index.ts --outdir dist --target bun",
    "build:frontend": "cd web-client && bun run build",
    "start": "bun run dist/index.js"
  },
  "dependencies": {
    "hono": "^4.6.0",
    "better-sqlite3": "^11.0.0"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.0",
    "bun-types": "^1.1.0",
    "typescript": "^5.6.0"
  }
}
```

- [ ] **Step 2: 创建 tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "noEmit": true,
    "strict": true,
    "skipLibCheck": true,
    "types": ["bun-types"]
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 3: 创建 bunfig.toml**

```toml
[install]
peer = true

[test]
preload = ["test-setup.ts"]
```

- [ ] **Step 4: 创建 CLI 入口**

```typescript
// src/cli.ts
export type CliOptions = {
  port?: number
  directory?: string
}

export function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {}
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === "-p" || arg === "--port") {
      options.port = parseInt(args[++i], 10)
    } else if (arg === "-d" || arg === "--directory") {
      options.directory = args[++i]
    }
  }
  
  return options
}

export function printHelp(): void {
  console.log(`
opencode-web - Agent 群聊 Web 界面

用法:
  opencode-web [选项]

选项:
  -p, --port <port>       监听端口 (默认: 3000)
  -d, --directory <path>  项目目录 (默认: 当前目录)
  -h, --help              显示帮助

示例:
  opencode-web
  opencode-web --port 8080
  opencode-web --directory ./my-project
`)
}
```

- [ ] **Step 5: 创建主入口**

```typescript
// src/index.ts
import { parseArgs, printHelp, type CliOptions } from "./cli"

const args = process.argv.slice(2)

if (args.includes("-h") || args.includes("--help")) {
  printHelp()
  process.exit(0)
}

const options: CliOptions = parseArgs(args)

const port = options.port ?? 3000
const directory = options.directory ?? process.cwd()

console.log(`OpenCode Web`)
console.log(`Port: ${port}`)
console.log(`Directory: ${directory}`)
console.log(``)
console.log(`TODO: 启动 server`)
```

- [ ] **Step 6: 创建 bin/cli.js**

```javascript
#!/usr/bin/env node
import { fileURLToPath } from "url"
import { dirname, join } from "path"
import { spawn } from "child_process"

const __dirname = dirname(fileURLToPath(import.meta.url))
const entry = join(__dirname, "..", "src", "index.ts")

const child = spawn("bun", ["run", entry, ...process.argv.slice(2)], {
  stdio: "inherit",
})

child.on("exit", (code) => process.exit(code ?? 0))
```

- [ ] **Step 7: 安装依赖并验证**

```bash
bun install
bun run dev --help
```
Expected: 显示帮助信息

- [ ] **Step 8: Commit**

```bash
git init
git add .
git commit -m "feat: initialize project structure"
```

---

### Task 2: SQLite 数据库层

**Files:**
- Create: `src/types.ts`
- Create: `src/db/index.ts`
- Create: `src/db/schema.ts`
- Create: `src/db/queries.ts`

- [ ] **Step 1: 创建共享类型**

```typescript
// src/types.ts
export type Group = {
  id: string
  name: string
  projectPath: string
  createdAt: string
}

export type GroupMember = {
  groupId: string
  agentName: string
  sessionId: string
  status: "idle" | "working" | "error"
}

export type Message = {
  id: string
  groupId: string
  senderType: "user" | "agent"
  senderName: string
  content: string
  mentions: string[]
  status: "completed" | "interrupted" | "error"
  createdAt: string
}

export type Agent = {
  name: string
  color: string
}
```

- [ ] **Step 2: 创建数据库 schema**

```typescript
// src/db/schema.ts
export const SCHEMA_VERSION = 1

export const CREATE_TABLES_SQL = `
CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS groups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  project_path TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS group_members (
  group_id TEXT NOT NULL,
  agent_name TEXT NOT NULL,
  session_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'idle',
  PRIMARY KEY (group_id, agent_name),
  FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL,
  sender_type TEXT NOT NULL,
  sender_name TEXT NOT NULL,
  content TEXT NOT NULL,
  mentions TEXT,
  status TEXT NOT NULL DEFAULT 'completed',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE
);
`
```

- [ ] **Step 3: 创建数据库入口**

```typescript
// src/db/index.ts
import Database from "better-sqlite3"
import { join } from "node:path"
import { homedir } from "node:os"
import { existsSync, mkdirSync } from "node:fs"
import { CREATE_TABLES_SQL, SCHEMA_VERSION } from "./schema"

let db: Database.Database | null = null

export function getDbPath(): string {
  const dir = join(homedir(), ".opencode-web")
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  return join(dir, "data.db")
}

export function initDb(): Database.Database {
  if (!db) {
    db = new Database(getDbPath())
    db.exec(CREATE_TABLES_SQL)
    
    const row = db.prepare("SELECT version FROM schema_version").get() as { version: number } | undefined
    if (!row) {
      db.prepare("INSERT INTO schema_version (version) VALUES (?)").run(SCHEMA_VERSION)
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
```

- [ ] **Step 4: 创建查询函数**

```typescript
// src/db/queries.ts
import Database from "better-sqlite3"
import type { Group, GroupMember, Message } from "../types"
import { randomUUID } from "node:crypto"

export function createGroup(db: Database.Database, name: string, projectPath: string): Group {
  const id = randomUUID()
  db.prepare(`
    INSERT INTO groups (id, name, project_path)
    VALUES (?, ?, ?)
  `).run(id, name, projectPath)
  
  return {
    id,
    name,
    projectPath,
    createdAt: new Date().toISOString(),
  }
}

export function listGroups(db: Database.Database): Group[] {
  const rows = db.prepare(`
    SELECT id, name, project_path, created_at
    FROM groups
    ORDER BY created_at DESC
  `).all() as Array<{ id: string; name: string; project_path: string; created_at: string }>
  
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    projectPath: row.project_path,
    createdAt: row.created_at,
  }))
}

export function getGroup(db: Database.Database, id: string): Group | null {
  const row = db.prepare(`
    SELECT id, name, project_path, created_at
    FROM groups WHERE id = ?
  `).get(id) as { id: string; name: string; project_path: string; created_at: string } | undefined
  
  if (!row) return null
  
  return {
    id: row.id,
    name: row.name,
    projectPath: row.project_path,
    createdAt: row.created_at,
  }
}

export function deleteGroup(db: Database.Database, id: string): void {
  db.prepare("DELETE FROM groups WHERE id = ?").run(id)
}

export function addMember(db: Database.Database, groupId: string, agentName: string, sessionId: string): GroupMember {
  db.prepare(`
    INSERT INTO group_members (group_id, agent_name, session_id, status)
    VALUES (?, ?, ?, 'idle')
  `).run(groupId, agentName, sessionId)
  
  return {
    groupId,
    agentName,
    sessionId,
    status: "idle",
  }
}

export function listMembers(db: Database.Database, groupId: string): GroupMember[] {
  const rows = db.prepare(`
    SELECT group_id, agent_name, session_id, status
    FROM group_members WHERE group_id = ?
  `).all(groupId) as Array<{ group_id: string; agent_name: string; session_id: string; status: string }>
  
  return rows.map((row) => ({
    groupId: row.group_id,
    agentName: row.agent_name,
    sessionId: row.session_id,
    status: row.status as "idle" | "working" | "error",
  }))
}

export function removeMember(db: Database.Database, groupId: string, agentName: string): void {
  db.prepare(`
    DELETE FROM group_members
    WHERE group_id = ? AND agent_name = ?
  `).run(groupId, agentName)
}

export function updateMemberStatus(db: Database.Database, groupId: string, agentName: string, status: "idle" | "working" | "error"): void {
  db.prepare(`
    UPDATE group_members SET status = ?
    WHERE group_id = ? AND agent_name = ?
  `).run(status, groupId, agentName)
}

export function createMessage(
  db: Database.Database,
  groupId: string,
  senderType: "user" | "agent",
  senderName: string,
  content: string,
  mentions: string[]
): Message {
  const id = randomUUID()
  const mentionsJson = JSON.stringify(mentions)
  
  db.prepare(`
    INSERT INTO messages (id, group_id, sender_type, sender_name, content, mentions, status)
    VALUES (?, ?, ?, ?, ?, ?, 'completed')
  `).run(id, groupId, senderType, senderName, content, mentionsJson)
  
  return {
    id,
    groupId,
    senderType,
    senderName,
    content,
    mentions,
    status: "completed",
    createdAt: new Date().toISOString(),
  }
}

export function listMessages(db: Database.Database, groupId: string, limit = 100): Message[] {
  const rows = db.prepare(`
    SELECT id, group_id, sender_type, sender_name, content, mentions, status, created_at
    FROM messages
    WHERE group_id = ?
    ORDER BY created_at DESC
    LIMIT ?
  `).all(groupId, limit) as Array<{
    id: string
    group_id: string
    sender_type: string
    sender_name: string
    content: string
    mentions: string
    status: string
    created_at: string
  }>
  
  return rows.reverse().map((row) => ({
    id: row.id,
    groupId: row.group_id,
    senderType: row.sender_type as "user" | "agent",
    senderName: row.sender_name,
    content: row.content,
    mentions: JSON.parse(row.mentions || "[]"),
    status: row.status as "completed" | "interrupted" | "error",
    createdAt: row.created_at,
  }))
}
```

- [ ] **Step 5: Commit**

```bash
git add src/types.ts src/db/
git commit -m "feat: add SQLite database layer"
```

---

### Task 3: Hono Server 与 API

**Files:**
- Create: `src/api/index.ts`
- Create: `src/api/groups.ts`
- Create: `src/api/agents.ts`
- Create: `src/api/messages.ts`
- Create: `src/server.ts`
- Modify: `src/index.ts`

- [ ] **Step 1: 创建群 API**

```typescript
// src/api/groups.ts
import { Hono } from "hono"
import { getDb } from "../db"
import { createGroup, listGroups, getGroup, deleteGroup, addMember, removeMember, listMembers } from "../db/queries"

const app = new Hono()

app.get("/", (c) => {
  const db = getDb()
  const groups = listGroups(db)
  return c.json(groups)
})

app.post("/", async (c) => {
  const body = await c.req.json<{ name: string; projectPath: string }>()
  const db = getDb()
  const group = createGroup(db, body.name, body.projectPath)
  return c.json(group, 201)
})

app.get("/:id", (c) => {
  const id = c.req.param("id")
  const db = getDb()
  const group = getGroup(db, id)
  if (!group) {
    return c.json({ error: "Group not found" }, 404)
  }
  return c.json(group)
})

app.delete("/:id", (c) => {
  const id = c.req.param("id")
  const db = getDb()
  deleteGroup(db, id)
  return c.json({ success: true })
})

app.get("/:id/members", (c) => {
  const id = c.req.param("id")
  const db = getDb()
  const members = listMembers(db, id)
  return c.json(members)
})

app.post("/:id/members", async (c) => {
  const groupId = c.req.param("id")
  const body = await c.req.json<{ agentName: string; sessionId: string }>()
  const db = getDb()
  const member = addMember(db, groupId, body.agentName, body.sessionId)
  return c.json(member, 201)
})

app.delete("/:id/members/:agentName", (c) => {
  const groupId = c.req.param("id")
  const agentName = c.req.param("agentName")
  const db = getDb()
  removeMember(db, groupId, agentName)
  return c.json({ success: true })
})

export default app
```

- [ ] **Step 2: 创建 Agent API**

```typescript
// src/api/agents.ts
import { Hono } from "hono"
import type { Agent } from "../types"

const app = new Hono()

const AVAILABLE_AGENTS: Agent[] = [
  { name: "sisyphus", color: "#0096ff" },
  { name: "hephaestus", color: "#7c3aed" },
  { name: "prometheus", color: "#f59e0b" },
  { name: "atlas", color: "#10b981" },
]

app.get("/", (c) => {
  return c.json(AVAILABLE_AGENTS)
})

export default app
```

- [ ] **Step 3: 创建消息 API**

```typescript
// src/api/messages.ts
import { Hono } from "hono"
import { getDb } from "../db"
import { createMessage, listMessages } from "../db/queries"

const app = new Hono()

app.get("/", (c) => {
  const groupId = c.req.param("groupId")
  const limit = parseInt(c.req.query("limit") || "100")
  const db = getDb()
  const messages = listMessages(db, groupId, limit)
  return c.json(messages)
})

app.post("/", async (c) => {
  const groupId = c.req.param("groupId")
  const body = await c.req.json<{
    senderType: "user" | "agent"
    senderName: string
    content: string
    mentions: string[]
  }>()
  
  const db = getDb()
  const message = createMessage(db, groupId, body.senderType, body.senderName, body.content, body.mentions)
  return c.json(message, 201)
})

export default app
```

- [ ] **Step 4: 创建 API 路由入口**

```typescript
// src/api/index.ts
import { Hono } from "hono"
import groups from "./groups"
import agents from "./agents"
import messages from "./messages"

const app = new Hono()

app.route("/groups", groups)
app.route("/agents", agents)

groups.route("/:groupId/messages", messages)

export default app
```

- [ ] **Step 5: 创建 Server**

```typescript
// src/server.ts
import { Hono } from "hono"
import { serveStatic } from "hono/bun"
import api from "./api"
import { initDb, closeDb } from "./db"

export type ServerOptions = {
  port: number
  directory: string
}

export function createServer(options: ServerOptions) {
  initDb()
  
  const app = new Hono()
  
  app.route("/api", api)
  
  app.get("/health", (c) => c.json({ status: "ok" }))
  
  app.use("/*", serveStatic({ root: "./web-client/dist" }))
  
  app.get("/", (c) => {
    return c.html(`<!DOCTYPE html>
<html lang="zh">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>OpenCode Web</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>`)
  })
  
  return app
}

export function startServer(options: ServerOptions): void {
  const app = createServer(options)
  
  console.log(`OpenCode Web started at http://localhost:${options.port}`)
  console.log(`Project directory: ${options.directory}`)
  
  const shutdown = () => {
    console.log("\nShutting down...")
    closeDb()
    process.exit(0)
  }
  
  process.on("SIGINT", shutdown)
  process.on("SIGTERM", shutdown)
  
  Bun.serve({
    fetch: app.fetch,
    port: options.port,
  })
}
```

- [ ] **Step 6: 更新主入口**

```typescript
// src/index.ts
import { parseArgs, printHelp, type CliOptions } from "./cli"
import { startServer } from "./server"

const args = process.argv.slice(2)

if (args.includes("-h") || args.includes("--help")) {
  printHelp()
  process.exit(0)
}

const options: CliOptions = parseArgs(args)

const port = options.port ?? 3000
const directory = options.directory ?? process.cwd()

startServer({ port, directory })
```

- [ ] **Step 7: 验证 server 启动**

```bash
bun install
timeout 3 bun run dev --port 3001 || true
```
Expected: 输出 "OpenCode Web started at http://localhost:3001"

- [ ] **Step 8: Commit**

```bash
git add src/api/ src/server.ts src/index.ts
git commit -m "feat: add Hono server with REST API"
```

---

### Task 4: WebSocket 实时通信

**Files:**
- Create: `src/ws/index.ts`
- Create: `src/ws/handler.ts`
- Create: `src/ws/types.ts`
- Modify: `src/server.ts`

- [ ] **Step 1: 创建 WebSocket 类型**

```typescript
// src/ws/types.ts
export type WsMessage =
  | { type: "user_message"; groupId: string; content: string; mentions: string[] }
  | { type: "agent_message"; groupId: string; agentName: string; content: string }
  | { type: "agent_status"; groupId: string; agentName: string; status: "idle" | "working" | "error" }
  | { type: "agent_interrupted"; groupId: string; agentName: string }
```

- [ ] **Step 2: 创建 WebSocket handler**

```typescript
// src/ws/handler.ts
import type { ServerWebSocket } from "bun"
import type { WsMessage } from "./types"
import { getDb } from "../db"
import { createMessage } from "../db/queries"

const connections = new Map<string, Set<ServerWebSocket<unknown>>>()

export function handleOpen(ws: ServerWebSocket<unknown>, groupId: string): void {
  if (!connections.has(groupId)) {
    connections.set(groupId, new Set())
  }
  connections.get(groupId)!.add(ws)
}

export function handleClose(ws: ServerWebSocket<unknown>, groupId: string): void {
  connections.get(groupId)?.delete(ws)
}

export async function handleMessage(
  ws: ServerWebSocket<unknown>,
  message: string,
  groupId: string
): Promise<void> {
  const parsed = JSON.parse(message) as WsMessage
  
  if (parsed.type === "user_message") {
    const db = getDb()
    const msg = createMessage(db, groupId, "user", "你", parsed.content, parsed.mentions)
    
    broadcast(groupId, {
      type: "user_message",
      groupId,
      content: msg.content,
      mentions: msg.mentions,
    })
    
    for (const agentName of parsed.mentions) {
      broadcast(groupId, {
        type: "agent_status",
        groupId,
        agentName,
        status: "working",
      })
      
      setTimeout(() => {
        broadcast(groupId, {
          type: "agent_message",
          groupId,
          agentName,
          content: `[${agentName}] 收到任务: ${parsed.content}`,
        })
        
        broadcast(groupId, {
          type: "agent_status",
          groupId,
          agentName,
          status: "idle",
        })
      }, 1000)
    }
  }
}

export function broadcast(groupId: string, message: WsMessage): void {
  const conns = connections.get(groupId)
  if (conns) {
    const data = JSON.stringify(message)
    for (const ws of conns) {
      ws.send(data)
    }
  }
}
```

- [ ] **Step 3: 创建 WebSocket 路由**

```typescript
// src/ws/index.ts
import { Hono } from "hono"
import { createBunWebSocket } from "hono/bun"
import { handleOpen, handleClose, handleMessage } from "./handler"

const app = new Hono()
const { upgradeWebSocket, websocket } = createBunWebSocket()

app.get(
  "/:groupId",
  upgradeWebSocket((c) => ({
    onOpen: (_event, ws) => {
      const groupId = c.req.param("groupId")
      handleOpen(ws.raw as ServerWebSocket<unknown>, groupId)
    },
    onClose: (_event, ws) => {
      const groupId = c.req.param("groupId")
      handleClose(ws.raw as ServerWebSocket<unknown>, groupId)
    },
    onMessage: async (event, ws) => {
      const groupId = c.req.param("groupId")
      await handleMessage(ws.raw as ServerWebSocket<unknown>, event.data.toString(), groupId)
    },
  }))
)

export default app
export { websocket }
```

- [ ] **Step 4: 集成 WebSocket 到 server**

修改 `src/server.ts`:
```typescript
import ws, { websocket } from "./ws"

export function createServer(options: ServerOptions) {
  initDb()
  
  const app = new Hono()
  
  app.route("/api", api)
  app.route("/ws", ws)
  
  app.get("/health", (c) => c.json({ status: "ok" }))
  
  app.use("/*", serveStatic({ root: "./web-client/dist" }))
  
  return { app, websocket }
}

export function startServer(options: ServerOptions): void {
  const { app, websocket } = createServer(options)
  
  console.log(`OpenCode Web started at http://localhost:${options.port}`)
  console.log(`Project directory: ${options.directory}`)
  
  const shutdown = () => {
    console.log("\nShutting down...")
    closeDb()
    process.exit(0)
  }
  
  process.on("SIGINT", shutdown)
  process.on("SIGTERM", shutdown)
  
  Bun.serve({
    fetch: app.fetch,
    port: options.port,
    websocket,
  })
}
```

- [ ] **Step 5: Commit**

```bash
git add src/ws/ src/server.ts
git commit -m "feat: add WebSocket real-time communication"
```

---

## Phase 2: 前端

### Task 5: React 前端初始化

**Files:**
- Create: `web-client/package.json`
- Create: `web-client/vite.config.ts`
- Create: `web-client/tsconfig.json`
- Create: `web-client/index.html`
- Create: `web-client/src/main.tsx`
- Create: `web-client/src/App.tsx`
- Create: `web-client/src/App.css`
- Create: `web-client/src/types.ts`

- [ ] **Step 1: 创建前端 package.json**

```json
{
  "name": "opencode-web-client",
  "private": true,
  "version": "0.0.1",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.3.0",
    "typescript": "^5.6.0",
    "vite": "^6.0.0"
  }
}
```

- [ ] **Step 2: 创建 vite.config.ts**

```typescript
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
})
```

- [ ] **Step 3: 创建 tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true
  },
  "include": ["src"]
}
```

- [ ] **Step 4: 创建 index.html**

```html
<!DOCTYPE html>
<html lang="zh">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>OpenCode Web - Agent 群聊</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 5: 创建 main.tsx**

```typescript
import React from "react"
import ReactDOM from "react-dom/client"
import App from "./App"
import "./App.css"

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

- [ ] **Step 6: 创建 types.ts**

```typescript
export type Group = {
  id: string
  name: string
  projectPath: string
  createdAt: string
}

export type Agent = {
  name: string
  color: string
}

export type Message = {
  id: string
  groupId: string
  senderType: "user" | "agent"
  senderName: string
  content: string
  mentions: string[]
  status: "completed" | "interrupted" | "error"
  createdAt: string
}

export type WsMessage =
  | { type: "user_message"; groupId: string; content: string; mentions: string[] }
  | { type: "agent_message"; groupId: string; agentName: string; content: string }
  | { type: "agent_status"; groupId: string; agentName: string; status: "idle" | "working" | "error" }
  | { type: "agent_interrupted"; groupId: string; agentName: string }
```

- [ ] **Step 7: 创建 App.tsx**

```typescript
import { useState, useEffect } from "react"
import type { Group, Agent, Message } from "./types"
import GroupList from "./components/GroupList"
import AgentList from "./components/AgentList"
import MessageList from "./components/MessageList"
import MessageInput from "./components/MessageInput"
import CreateGroupModal from "./components/CreateGroupModal"
import { useWebSocket } from "./hooks/useWebSocket"

export default function App() {
  const [groups, setGroups] = useState<Group[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  
  const { sendMessage } = useWebSocket(selectedGroupId, (msg) => {
    if (msg.type === "user_message") {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          groupId: msg.groupId,
          senderType: "user",
          senderName: "你",
          content: msg.content,
          mentions: msg.mentions,
          status: "completed",
          createdAt: new Date().toISOString(),
        },
      ])
    } else if (msg.type === "agent_message") {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          groupId: msg.groupId,
          senderType: "agent",
          senderName: msg.agentName,
          content: msg.content,
          mentions: [],
          status: "completed",
          createdAt: new Date().toISOString(),
        },
      ])
    }
  })
  
  useEffect(() => {
    fetch("/api/groups")
      .then((res) => res.json())
      .then(setGroups)
      .catch(console.error)
    
    fetch("/api/agents")
      .then((res) => res.json())
      .then(setAgents)
      .catch(console.error)
  }, [])
  
  useEffect(() => {
    if (selectedGroupId) {
      fetch(`/api/groups/${selectedGroupId}/messages`)
        .then((res) => res.json())
        .then(setMessages)
        .catch(console.error)
    }
  }, [selectedGroupId])
  
  const handleSendMessage = (content: string, mentions: string[]) => {
    if (selectedGroupId) {
      sendMessage({ type: "user_message", groupId: selectedGroupId, content, mentions })
    }
  }
  
  const handleCreateGroup = async (name: string, projectPath: string) => {
    const res = await fetch("/api/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, projectPath }),
    })
    const group = await res.json()
    setGroups((prev) => [group, ...prev])
    setSelectedGroupId(group.id)
    setShowCreateModal(false)
  }
  
  return (
    <div className="app">
      <aside className="sidebar">
        <GroupList
          groups={groups}
          selectedId={selectedGroupId}
          onSelect={setSelectedGroupId}
          onCreate={() => setShowCreateModal(true)}
        />
        <AgentList agents={agents} />
      </aside>
      <main className="main">
        {selectedGroupId ? (
          <>
            <MessageList messages={messages} agents={agents} />
            <MessageInput agents={agents} onSend={handleSendMessage} />
          </>
        ) : (
          <div className="empty">选择或创建一个群开始聊天</div>
        )}
      </main>
      {showCreateModal && (
        <CreateGroupModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateGroup}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 8: 创建 App.css**

```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  background: #ffffff;
  color: #111827;
}

.app {
  display: flex;
  height: 100vh;
}

.sidebar {
  width: 220px;
  background: #f8f9fa;
  border-right: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
}

.main {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #fafafa;
}

.empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #9ca3af;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal {
  background: #ffffff;
  padding: 24px;
  border-radius: 8px;
  min-width: 400px;
}

.modal h2 {
  margin-bottom: 16px;
}

.modal input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  margin-bottom: 12px;
}

.modal-buttons {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  margin-top: 16px;
}

.modal-buttons button {
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
}

.modal-buttons button:first-child {
  background: transparent;
  border: 1px solid #d1d5db;
  color: #6b7280;
}

.modal-buttons button:last-child {
  background: #0096ff;
  border: none;
  color: #ffffff;
}
```

- [ ] **Step 9: 安装前端依赖**

```bash
cd web-client && bun install && cd ..
```

- [ ] **Step 10: Commit**

```bash
git add web-client/
git commit -m "feat: initialize React frontend"
```

---

### Task 6: 前端组件

**Files:**
- Create: `web-client/src/components/GroupList.tsx`
- Create: `web-client/src/components/AgentList.tsx`
- Create: `web-client/src/components/MessageList.tsx`
- Create: `web-client/src/components/MessageInput.tsx`
- Create: `web-client/src/components/CreateGroupModal.tsx`
- Create: `web-client/src/hooks/useWebSocket.ts`

- [ ] **Step 1: 创建 GroupList**

```typescript
import type { Group } from "../types"

type Props = {
  groups: Group[]
  selectedId: string | null
  onSelect: (id: string) => void
  onCreate: () => void
}

export default function GroupList({ groups, selectedId, onSelect, onCreate }: Props) {
  return (
    <div style={{ padding: 12, borderBottom: "1px solid #e5e7eb" }}>
      <div style={{ color: "#9ca3af", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>
        群列表
      </div>
      {groups.map((group) => (
        <div
          key={group.id}
          onClick={() => onSelect(group.id)}
          style={{
            padding: 8,
            borderRadius: 4,
            cursor: "pointer",
            marginBottom: 4,
            background: selectedId === group.id ? "rgba(0,150,255,0.08)" : "transparent",
            color: selectedId === group.id ? "#0096ff" : "#6b7280",
          }}
        >
          <span style={{ color: "#10b981" }}>●</span> {group.name}
        </div>
      ))}
      <button
        onClick={onCreate}
        style={{
          width: "100%",
          padding: 8,
          marginTop: 8,
          background: "#ffffff",
          border: "1px solid #d1d5db",
          color: "#6b7280",
          borderRadius: 4,
          cursor: "pointer",
          fontSize: 12,
        }}
      >
        + 新建群
      </button>
    </div>
  )
}
```

- [ ] **Step 2: 创建 AgentList**

```typescript
import type { Agent } from "../types"

type Props = {
  agents: Agent[]
}

export default function AgentList({ agents }: Props) {
  return (
    <div style={{ padding: 12, flex: 1, overflow: "auto" }}>
      <div style={{ color: "#9ca3af", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>
        可用 Agent
      </div>
      {agents.map((agent) => (
        <div
          key={agent.name}
          style={{ padding: "6px 8px", color: "#374151", fontSize: 12 }}
        >
          <span style={{ color: agent.color }}>●</span> {agent.name}
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: 创建 MessageList**

```typescript
import type { Message, Agent } from "../types"

type Props = {
  messages: Message[]
  agents: Agent[]
}

export default function MessageList({ messages, agents }: Props) {
  const getAgentColor = (name: string): string => {
    const agent = agents.find((a) => a.name === name)
    return agent?.color || "#6b7280"
  }
  
  return (
    <div style={{ flex: 1, padding: 16, overflow: "auto" }}>
      {messages.map((msg) => (
        <div key={msg.id} style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", marginBottom: 4 }}>
            <span
              style={{
                color: msg.senderType === "user" ? "#111827" : getAgentColor(msg.senderName),
                fontWeight: 500,
              }}
            >
              {msg.senderType === "user" ? "🧑 你" : `🤖 ${msg.senderName}`}
            </span>
            <span style={{ color: "#d1d5db", fontSize: 11, marginLeft: 8 }}>
              {new Date(msg.createdAt).toLocaleTimeString()}
            </span>
          </div>
          <div style={{ color: "#374151", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{msg.content}</div>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 4: 创建 MessageInput**

```typescript
import { useState } from "react"
import type { Agent } from "../types"

type Props = {
  agents: Agent[]
  onSend: (content: string, mentions: string[]) => void
}

export default function MessageInput({ agents, onSend }: Props) {
  const [input, setInput] = useState("")
  
  const handleSend = () => {
    if (!input.trim()) return
    
    const mentions: string[] = []
    const mentionRegex = /@(\w+)/g
    let match
    while ((match = mentionRegex.exec(input)) !== null) {
      if (agents.some((a) => a.name === match[1])) {
        mentions.push(match[1])
      }
    }
    
    onSend(input, mentions)
    setInput("")
  }
  
  return (
    <div style={{ padding: "12px 16px", borderTop: "1px solid #e5e7eb", background: "#ffffff", display: "flex", gap: 8 }}>
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSend()}
        placeholder="输入消息... @ 提及 agent"
        style={{
          flex: 1,
          padding: "8px 12px",
          background: "#f8f9fa",
          border: "1px solid #e5e7eb",
          borderRadius: 6,
          fontSize: 14,
          outline: "none",
        }}
      />
      <button
        onClick={handleSend}
        style={{
          padding: "8px 16px",
          background: "#0096ff",
          border: "none",
          color: "#ffffff",
          borderRadius: 6,
          cursor: "pointer",
          fontWeight: 500,
        }}
      >
        发送
      </button>
    </div>
  )
}
```

- [ ] **Step 5: 创建 CreateGroupModal**

```typescript
import { useState } from "react"

type Props = {
  onClose: () => void
  onCreate: (name: string, projectPath: string) => void
}

export default function CreateGroupModal({ onClose, onCreate }: Props) {
  const [name, setName] = useState("")
  const [projectPath, setProjectPath] = useState(process.cwd?.() || ".")
  
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>新建群</h2>
        <input
          type="text"
          placeholder="群名称"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          type="text"
          placeholder="项目路径"
          value={projectPath}
          onChange={(e) => setProjectPath(e.target.value)}
        />
        <div className="modal-buttons">
          <button onClick={onClose}>取消</button>
          <button onClick={() => name && projectPath && onCreate(name, projectPath)}>
            创建
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 6: 创建 useWebSocket**

```typescript
import { useEffect, useRef } from "react"
import type { WsMessage } from "../types"

export function useWebSocket(groupId: string | null, onMessage: (msg: WsMessage) => void) {
  const wsRef = useRef<WebSocket | null>(null)
  const onMessageRef = useRef(onMessage)
  
  onMessageRef.current = onMessage
  
  useEffect(() => {
    if (!groupId) return
    
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:"
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws/${groupId}`)
    wsRef.current = ws
    
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data) as WsMessage
      onMessageRef.current(msg)
    }
    
    return () => {
      ws.close()
    }
  }, [groupId])
  
  const sendMessage = (msg: WsMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg))
    }
  }
  
  return { sendMessage }
}
```

- [ ] **Step 7: Commit**

```bash
git add web-client/src/components/ web-client/src/hooks/
git commit -m "feat: add React components and hooks"
```

---

### Task 7: 构建与集成

**Files:**
- Modify: `src/server.ts`
- Modify: `package.json`

- [ ] **Step 1: 更新 server 静态文件路径**

修改 `src/server.ts` 的静态文件服务:
```typescript
import { join } from "node:path"

app.use("/*", serveStatic({ root: join(import.meta.dir, "..", "web-client", "dist") }))
```

- [ ] **Step 2: 添加构建脚本到 package.json**

```json
{
  "scripts": {
    "dev": "bun run src/index.ts",
    "build": "bun build src/index.ts --outdir dist --target bun && cd web-client && bun run build",
    "start": "bun run dist/index.js"
  }
}
```

- [ ] **Step 3: 构建前端**

```bash
cd web-client && bun run build && cd ..
```

- [ ] **Step 4: 验证完整流程**

```bash
bun run dev
```
打开浏览器访问 http://localhost:3000

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "feat: complete web interface integration"
```

---

## 完成检查清单

- [ ] CLI 命令可用 (`opencode-web --help`)
- [ ] Hono server 启动正常
- [ ] SQLite 数据库初始化
- [ ] 群管理 API 工作正常
- [ ] 消息 API 工作正常
- [ ] WebSocket 实时通信
- [ ] React 前端渲染正常
- [ ] 前后端集成测试通过
