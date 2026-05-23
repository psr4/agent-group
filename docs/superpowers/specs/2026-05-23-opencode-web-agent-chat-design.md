# OpenCode Web - Agent 群聊界面设计

> **创建日期**: 2026-05-23
> **状态**: 设计完成，待实现

## 概述

`opencode web` 启动独立 web 服务，提供群聊界面让开发者管理多个 agent 协作完成开发任务。

### 核心特性

1. **群聊模式** - 创建多个群，每个群可邀请不同 agent
2. **@mention 触发** - @agent 名字触发响应
3. **Agent 互不可见** - 每个 agent 独立 session，只看到 @ 自己的消息
4. **实时流式输出** - Agent 回复实时流式显示
5. **中断机制** - 工作中可被新消息中断，立即处理新任务
6. **上下文记忆** - 群内 agent 保持对话上下文
7. **持久化存储** - SQLite 保存群、成员、消息历史

---

## 技术栈

| 层 | 技术 |
|---|------|
| CLI 命令 | 新增 `opencode web` 子命令 |
| 后端框架 | Hono |
| 前端框架 | React |
| 实时通信 | WebSocket |
| 数据库 | SQLite (`~/.omo/web/web.db`) |
| Agent 管理 | OpenCode SDK (`@opencode-ai/sdk`) |

---

## 架构设计

```
opencode web                    # CLI 命令
  │
  └─→ Web Server (Hono)         # 单进程，端口默认 3000
        │
        ├─→ Static Files        # React 构建产物
        │
        ├─→ REST API            # 群管理、消息、配置
        │     ├─→ GET  /api/groups              # 列出所有群
        │     ├─→ POST /api/groups              # 创建群
        │     ├─→ GET  /api/groups/:id          # 获取群详情
        │     ├─→ DELETE /api/groups/:id        # 删除群
        │     ├─→ POST /api/groups/:id/members  # 添加成员
        │     ├─→ DELETE /api/groups/:id/members/:agentName  # 移除成员
        │     ├─→ GET  /api/groups/:id/messages # 获取消息历史
        │     ├─→ POST /api/groups/:id/messages # 发送消息
        │     └─→ GET  /api/agents              # 列出可用 agents
        │
        ├─→ WebSocket            # 实时消息推送
        │     └─→ /ws/groups/:id  # 群内实时通信
        │
        ├─→ SQLite               # 数据持久化
        │     └─→ ~/.omo/web/web.db
        │           ├─→ groups        # 群信息
        │           ├─→ group_members # 群成员关系
        │           ├─→ messages      # 消息历史
        │           └─→ sessions      # agent session 映射
        │
        └─→ OpenCode SDK         # 管理多个 agent session
              ├─→ 每个群成员 agent = 一个独立 session
              ├─→ 复用现有 createOpencode SDK
              └─→ 内嵌运行，不依赖外部 server
```

---

## 数据模型

```sql
-- 群
CREATE TABLE groups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  project_path TEXT NOT NULL,  -- 关联的项目目录
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 群成员 (群+agent = 唯一 session)
CREATE TABLE group_members (
  group_id TEXT NOT NULL,
  agent_name TEXT NOT NULL,
  session_id TEXT NOT NULL,    -- 创建成员时即分配 session
  status TEXT DEFAULT 'idle',  -- idle | working | error
  PRIMARY KEY (group_id, agent_name)
);

-- 消息
CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL,
  sender_type TEXT NOT NULL,   -- 'user' | 'agent'
  sender_name TEXT NOT NULL,
  content TEXT NOT NULL,
  mentions TEXT,               -- JSON array of mentioned agents
  status TEXT DEFAULT 'completed',  -- completed | interrupted | error
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## Session 映射策略

**一个群的一个 agent = 一个持久 session**

示例：
- 群"开发群" + sisyphus → session_abc123
- 群"开发群" + hephaestus → session_def456
- 群"测试群" + sisyphus → session_xyz789 (不同群，不同 session)

同一个群的同一个 agent，无论被 @ 多少次，都复用同一个 session。

**优点**：
- agent 有群内上下文记忆，能参考之前的对话
- session 管理更简单，一对一映射
- 减少 session 创建开销

---

## 消息流程

### 用户发消息 → agent 响应

```
1. 用户输入: "@sisyphus 重构 auth 模块，@hephaestus 写测试"
   │
   ├─→ 解析 mentions: ["sisyphus", "hephaestus"]
   │
   ├─→ 保存消息到 SQLite
   │
   └─→ WebSocket 广播消息到前端（实时显示用户消息）

2. 后台为每个被 @ 的 agent 创建独立任务
   │
   ├─→ 检查该 agent 是否已有 session
   │     ├─→ 有：复用现有 session
   │     └─→ 无：通过 OpenCode SDK 创建新 session
   │
   ├─→ 构造 prompt:
   │     用户在群"开发群"中说：
   │     "@sisyphus 重构 auth 模块，@hephaestus 写测试"
   │     
   │     这是发给你（sisyphus）的任务，请处理。
   │     注意：其他 agent 看不到此对话，各自独立工作。
   │
   └─→ 调用 session.promptAsync() 发送消息

3. Agent 响应流
   │
   ├─→ 订阅 session 事件流 (session.event.subscribe)
   │
   ├─→ 收到 message 事件 → WebSocket 推送到前端
   │     └─→ 前端实时渲染流式输出
   │
   └─→ Agent 完成后标记任务结束
         └─→ WebSocket 推送完成状态
```

### 中断机制

```
Agent 工作中被 @ 新消息:
  │
  ├─→ 取消当前任务
  │     └─→ 调用 session.abort() 或 abortController.abort()
  │
  ├─→ 标记前任务为 "已中断"
  │     └─→ WebSocket 推送中断状态到前端
  │
  └─→ 立即发送新 prompt
        └─→ agent 开始处理新任务
```

---

## 错误处理与边界情况

### Agent 状态管理

```
成员状态机:
  idle ──→ working ──→ idle     (正常循环)
    │         │
    │         └──→ error ──→ idle  (异常恢复)
    │
    └──→ offline  (session 断开)
```

### 关键场景

| 场景 | 处理方式 |
|------|---------|
| Agent 正在工作，又被 @ | 中断当前任务，立即处理新消息 |
| Agent session 报错 | 标记 error 状态，WebSocket 通知前端，提供"重试"按钮 |
| 删除群 | 关闭所有成员 session，删除 SQLite 数据 |
| 移除群成员 | 关闭对应 session，保留历史消息 |
| Agent 响应超时 | 默认 5 分钟无输出标记超时，前端显示警告 |
| 服务重启 | 从 SQLite 恢复群和成员，重建 session 连接 |
| 同一 agent 加入多个群 | 每个群独立 session，互不影响 |

### 消息可靠性

- 用户消息先写 SQLite，再推送 agent，确保不丢消息
- Agent 输出逐条存 SQLite，WebSocket 断线后重连可拉取历史
- WebSocket 重连时，前端用最后消息 ID 请求增量消息

---

## UI 设计

### 整体布局

```
┌──────────────────────────────────────────────────────────┐
│  ◉ AgentChat                              [设置] [新建群] │
├────────────┬─────────────────────────────────────────────┤
│            │  群名: 开发群                    [成员列表]   │
│  开发群    │─────────────────────────────────────────────│
│  测试群    │                                             │
│  文档群    │  🧑 你: @sisyphus 重构 auth 模块，          │
│            │      @hephaestus 写对应的测试               │
│  ─────── │                                             │
│            │  🤖 Sisyphus:                              │
│  可用Agent │  正在分析 auth 模块结构...▌                 │
│  ·sisyphus │  ┌─────────────────────────────────┐       │
│  ·hephaest │  │ 我已开始重构 auth 模块，当前进度:  │       │
│  ·promethe │  │ - 拆分 auth.ts 为 3 个文件        │       │
│  ·atlas    │  │ - 添加类型定义                     │       │
│            │  │ - 重写 JWT 验证逻辑 ▌              │       │
│            │  └─────────────────────────────────┘       │
│            │                                             │
│            │  🤖 Hephaestus:                            │
│            │  等待 Sisyphus 完成后再生成测试...          │
│            │                                             │
│            │─────────────────────────────────────────────│
│            │  [输入消息...  @ 提及agent]     [发送]      │
└────────────┴─────────────────────────────────────────────┘
```

### 关键交互

1. **左侧边栏** - 上半部分群列表，下半部分可用 agent 列表
2. **消息输入** - 支持 @ 弹出 agent 选择器，类似 Slack
3. **agent 响应** - 流式输出，带打字效果，用不同颜色/图标区分
4. **成员列表** - 右上角按钮展开，显示在线 agent 和 session 状态
5. **新建群弹窗** - 输入群名 + 勾选 agent 成员

### 浅色主题色板

| 角色 | 颜色值 | 用途 |
|------|--------|------|
| 主背景 | `#ffffff` | 页面背景 |
| 侧边栏 | `#f8f9fa` | 左侧边栏背景 |
| 消息区 | `#fafafa` | 聊天消息区域背景 |
| 主强调 | `#0096ff` | 按钮、链接、Sisyphus 标识 |
| 次强调 | `#7c3aed` | Hephaestus 标识 |
| 主文字 | `#111827` | 标题、重要文字 |
| 次文字 | `#6b7280` | 正文 |
| 边框 | `#e5e7eb` | 分割线、卡片边框 |

### Agent 颜色标识

| Agent | 颜色 |
|-------|------|
| sisyphus | `#0096ff` (蓝) |
| hephaestus | `#7c3aed` (紫) |
| prometheus | `#f59e0b` (橙) |
| atlas | `#10b981` (绿) |

---

## 目录结构

```
src/
├── cli/
│   └── web/                    # 新增 web 子命令
│       ├── index.ts            # CLI 入口
│       ├── server.ts           # Hono server 启动
│       └── types.ts
│
├── web/                        # 新增 web 功能模块
│   ├── api/                    # REST API 端点
│   │   ├── groups.ts
│   │   ├── messages.ts
│   │   └── agents.ts
│   │
│   ├── ws/                     # WebSocket 处理
│   │   └── handler.ts
│   │
│   ├── db/                     # SQLite 数据库
│   │   ├── schema.ts
│   │   ├── migrations.ts
│   │   └── queries.ts
│   │
│   ├── session/                # Agent session 管理
│   │   ├── manager.ts          # 创建/复用/中断 session
│   │   └── event-stream.ts     # 订阅 agent 输出
│   │
│   └── static/                 # React 构建产物 (构建时生成)
│
└── web-client/                 # 新增前端项目 (独立目录)
    ├── src/
    │   ├── components/
    │   │   ├── GroupList.tsx
    │   │   ├── MessageList.tsx
    │   │   ├── MessageInput.tsx
    │   │   ├── AgentList.tsx
    │   │   └── MemberPanel.tsx
    │   ├── hooks/
    │   │   ├── useWebSocket.ts
    │   │   └── useGroups.ts
    │   ├── App.tsx
    │   └── main.tsx
    ├── package.json
    └── vite.config.ts          # Vite 构建
```

---

## API 端点

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/groups` | 列出所有群 |
| POST | `/api/groups` | 创建群 |
| GET | `/api/groups/:id` | 获取群详情 |
| DELETE | `/api/groups/:id` | 删除群 |
| POST | `/api/groups/:id/members` | 添加成员 |
| DELETE | `/api/groups/:id/members/:agentName` | 移除成员 |
| GET | `/api/groups/:id/messages` | 获取消息历史 |
| POST | `/api/groups/:id/messages` | 发送消息 |
| GET | `/api/agents` | 列出可用 agents |
| GET | `/ws/groups/:id` | WebSocket 连接 |

---

## CLI 使用

```bash
# 启动 web 界面
opencode web

# 指定端口
opencode web --port 8080

# 指定项目目录
opencode web --directory /path/to/project
```

---

## 实现优先级

### Phase 1: MVP
- CLI `opencode web` 命令
- Hono server 启动
- SQLite 数据库初始化
- 基础群管理 API
- 单 agent @mention 响应
- 基础 React UI

### Phase 2: 核心功能
- 多 agent 并行响应
- WebSocket 实时推送
- 流式输出显示
- 中断机制
- 消息历史持久化

### Phase 3: 完善
- 成员管理 UI
- 群列表切换
- 错误处理与重试
- 状态指示器
- 服务重启恢复

---

## 依赖

### 新增依赖

```json
{
  "dependencies": {
    "hono": "^4.x",
    "better-sqlite3": "^11.x",
    "@opencode-ai/sdk": "workspace:*"
  }
}
```

### 前端依赖

```json
{
  "dependencies": {
    "react": "^19.x",
    "react-dom": "^19.x"
  },
  "devDependencies": {
    "vite": "^6.x",
    "@types/react": "^19.x"
  }
}
```
