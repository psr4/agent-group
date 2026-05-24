# OpenCode Web - 后端架构文档

## 概述

OpenCode Web 后端基于 Hono 框架构建，提供 RESTful API 和 WebSocket 实时通信，支持多 Agent 群聊协作。

## 技术栈

| 组件 | 技术 | 版本 |
|------|------|------|
| Web 框架 | Hono | ^4.12.22 |
| HTTP 服务 | @hono/node-server | ^2.0.3 |
| 数据库 | better-sqlite3 | ^11.10.0 |
| WebSocket | ws | ^8.21.0 |
| Agent SDK | @opencode-ai/sdk | ^1.15.10 |

## 架构设计

```
src/
├── server.ts              # HTTP 服务入口
├── api/                   # REST API 路由
│   ├── index.ts          # API 路由聚合
│   ├── groups.ts         # 群管理 API
│   ├── agents.ts         # Agent 列表 API
│   ├── messages.ts       # 消息 API
│   └── models.ts         # 模型列表 API
├── ws/                    # WebSocket 处理
│   ├── index.ts          # WebSocket 服务初始化
│   ├── handler.ts        # 消息处理与广播
│   └── types.ts          # WebSocket 消息类型定义
├── session/               # Agent Session 管理
│   ├── index.ts          # Session 管理导出
│   ├── manager.ts        # Session 创建/复用/中断
│   └── events.ts         # OpenCode 事件解析
├── db/                    # 数据库层
│   ├── index.ts          # SQLite 初始化
│   ├── schema.ts         # 表结构定义
│   └── queries.ts        # 数据库查询函数
├── types.ts              # 核心类型定义
└── utils/                 # 工具函数
    ├── errors.ts         # 自定义错误类
    └── validation.ts     # 输入验证函数
```

## 数据模型

### SQLite 表结构

#### groups - 群信息
```sql
CREATE TABLE groups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  project_path TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);
```

#### group_members - 群成员
```sql
CREATE TABLE group_members (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL,
  agent_name TEXT NOT NULL,        -- OpenCode agent 名称
  display_name TEXT NOT NULL,      -- 群内显示名称
  session_id TEXT,                 -- OpenCode session ID
  session_initialized INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'idle',  -- idle | working | error
  role_prompt TEXT,                -- 自定义角色提示词
  model TEXT,                      -- 指定模型 (provider/model)
  bubble_color TEXT DEFAULT '#0096ff',
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE
);
```

#### messages - 消息历史
```sql
CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL,
  sender_type TEXT NOT NULL,       -- 'user' | 'agent'
  sender_name TEXT NOT NULL,
  content TEXT NOT NULL,
  mentions TEXT,                   -- JSON array of mentioned agents
  status TEXT NOT NULL DEFAULT 'completed',  -- completed | interrupted | error
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE
);
```

### TypeScript 类型定义

```typescript
type Group = {
  id: string
  name: string
  projectPath: string
  createdAt: string
}

type GroupMember = {
  id: string
  groupId: string
  agentName: string
  displayName: string
  sessionId?: string
  sessionInitialized?: boolean
  status: "idle" | "working" | "error"
  rolePrompt?: string
  model?: string
  bubbleColor: string
}

type Message = {
  id: string
  groupId: string
  senderType: "user" | "agent"
  senderName: string
  content: string
  mentions: string[]
  status: "completed" | "interrupted" | "error"
  createdAt: string
}

type Agent = {
  name: string
  description?: string
  color: string
}
```

## REST API 接口

### 群管理

#### GET /api/groups
列出所有群

**响应**:
```json
[
  {
    "id": "uuid",
    "name": "开发群",
    "projectPath": "/path/to/project",
    "createdAt": "2026-05-24T10:00:00Z"
  }
]
```

#### POST /api/groups
创建群

**请求体**:
```json
{
  "name": "开发群",
  "projectPath": "/path/to/project"
}
```

**响应**: `201` 返回创建的群对象

#### GET /api/groups/:id
获取群详情

#### DELETE /api/groups/:id
删除群（级联删除成员和消息）

#### PATCH /api/groups/:id
更新群信息

**请求体**:
```json
{
  "name": "新群名",
  "projectPath": "/new/path"
}
```

### 成员管理

#### GET /api/groups/:id/members
列出群内所有成员

**响应**:
```json
[
  {
    "id": "uuid",
    "groupId": "group-uuid",
    "agentName": "sisyphus",
    "displayName": "后端开发",
    "status": "idle",
    "rolePrompt": "你是后端开发专家...",
    "model": "anthropic/claude-3-opus",
    "bubbleColor": "#0096ff"
  }
]
```

#### POST /api/groups/:id/members
添加成员

**请求体**:
```json
{
  "agentName": "sisyphus",
  "displayName": "后端开发",
  "rolePrompt": "你是后端开发专家...",
  "model": "anthropic/claude-3-opus",
  "bubbleColor": "#0096ff"
}
```

#### DELETE /api/groups/:id/members/:memberId
移除成员

#### PATCH /api/groups/:id/members/:memberId
更新成员配置

### 消息管理

#### GET /api/groups/:id/messages
获取消息历史

**查询参数**:
- `limit`: 返回消息数量，默认 100

**响应**:
```json
[
  {
    "id": "uuid",
    "groupId": "group-uuid",
    "senderType": "user",
    "senderName": "你",
    "content": "@后端开发 重构 auth 模块",
    "mentions": ["后端开发"],
    "status": "completed",
    "createdAt": "2026-05-24T10:00:00Z"
  }
]
```

#### POST /api/groups/:id/messages
创建消息（通常通过 WebSocket 发送）

#### DELETE /api/groups/:id/messages
清空群内所有消息并重置 sessions

### Agent 列表

#### GET /api/agents
列出可用的 OpenCode agents

**查询参数**:
- `directory`: 项目目录，默认当前目录

**响应**:
```json
[
  {
    "name": "sisyphus",
    "description": "主开发 agent",
    "color": "#0096ff"
  }
]
```

### 模型列表

#### GET /api/models
列出可用的模型

## WebSocket 协议

### 连接

WebSocket 端点: `ws://localhost:3000/ws/groups/:groupId`

### 客户端发送消息

#### user_message - 用户消息
```json
{
  "type": "user_message",
  "content": "@后端开发 重构 auth 模块",
  "mentions": ["后端开发"]
}
```

### 服务端推送消息

#### user_message - 广播用户消息
```json
{
  "type": "user_message",
  "groupId": "group-uuid",
  "content": "@后端开发 重构 auth 模块",
  "mentions": ["后端开发"]
}
```

#### agent_message - Agent 回复（流式）
```json
{
  "type": "agent_message",
  "groupId": "group-uuid",
  "memberId": "member-uuid",
  "agentName": "后端开发",
  "content": "正在分析 auth 模块..."
}
```

#### agent_status - Agent 状态变更
```json
{
  "type": "agent_status",
  "groupId": "group-uuid",
  "memberId": "member-uuid",
  "agentName": "后端开发",
  "status": "working"
}
```

状态值: `idle` | `working` | `error`

#### agent_interrupted - Agent 被中断
```json
{
  "type": "agent_interrupted",
  "groupId": "group-uuid",
  "memberId": "member-uuid",
  "agentName": "后端开发"
}
```

#### error - 错误消息
```json
{
  "type": "error",
  "error": "错误描述"
}
```

### 连接管理

- 单群最大连接数: 100
- 总最大连接数: 1000
- 心跳检测: 30 秒间隔，60 秒超时

## Session 管理机制

### 核心概念

**一个群的一个 Agent = 一个持久 Session**

- 同一群的同一 Agent，无论被 @ 多少次，都复用同一个 session
- 不同群的同一 Agent，使用不同的 session
- Session 具有群内上下文记忆

### Session 生命周期

```
成员添加 → 创建 session (延迟初始化)
    ↓
首次 @ → 发送完整系统提示 → initialized = true
    ↓
后续 @ → 仅发送用户消息 (复用上下文)
    ↓
成员移除/群删除 → 关闭 session
```

### 系统提示构建

首次发送时，构建完整系统提示:

```
你是群聊中的 "后端开发" agent。

## 群聊信息
- 群ID: xxx
- 项目路径: /path/to/project
- 群内其他成员: 前端开发, 测试

## 重要规则
- 你只能看到发给你 (@后端开发) 的消息
- 其他 agent 看不到此对话，各自独立工作
- 如果需要回复用户，使用 <replay master="true">消息内容</replay>
- 如果需要和其他 agent 协作，使用 <replay to="成员名">消息内容</replay>
- 你的回复会实时显示在群里
- 如果是其他 agent 给你分配任务，完成任务后用 <replay to="分配者名">回复内容</replay> 告知结果

## 你的角色
[自定义 rolePrompt]

## 用户消息
[用户输入]
```

### 中断机制

当 Agent 正在工作被新消息 @ 时:

1. 调用 `session.abort()` 中断当前任务
2. 广播 `agent_interrupted` 消息
3. 立即发送新 prompt
4. Agent 开始处理新任务

### Agent 协作协议

Agent 可通过 `<replay>` 标签与其他 Agent 协作:

```xml
<!-- 回复用户 -->
<replay master="true">重构完成，请查看代码</replay>

<!-- 请求其他 Agent 协作 -->
<replay to="前端开发">后端 API 已完成，请对接接口</replay>

<!-- 同时回复多方 -->
<replay to="前端开发,测试" master="true">
API 已更新，前端请对接，测试请编写用例
</replay>
```

后端解析 `<replay>` 标签并触发对应 Agent 的 session。

## 消息流程

### 用户消息 → Agent 响应

```
1. 用户输入 → WebSocket
   ├─ 解析 mentions
   ├─ 保存到 SQLite
   └─ 广播到前端

2. 后台为每个被 @ 的 Agent 创建任务
   ├─ 检查 session (复用或创建)
   ├─ 构造 prompt
   └─ 调用 session.promptAsync()

3. 订阅 OpenCode 事件流
   ├─ message 事件 → 流式推送前端
   ├─ idle 事件 → 标记完成
   └─ error 事件 → 标记错误

4. Agent 完成
   ├─ 保存回复到 SQLite
   ├─ 解析 <replay> 标签
   └─ 触发协作 Agent
```

### 错误处理

| 场景 | 处理 |
|------|------|
| Agent session 错误 | 标记 error 状态，广播错误消息 |
| 删除群 | 关闭所有 sessions，级联删除数据 |
| 移除成员 | 关闭对应 session，保留历史消息 |
| WebSocket 断线 | 客户端重连后拉取历史消息 |

## 数据库操作

### 初始化

数据库文件位置: `~/.omo/web/web.db`

首次启动时自动创建表和索引。

### 查询函数

```typescript
// 群操作
createGroup(db, name, projectPath): Group
listGroups(db): Group[]
getGroup(db, id): Group | null
deleteGroup(db, id): void

// 成员操作
addMember(db, groupId, agentName, displayName, ...): GroupMember
listMembers(db, groupId): GroupMember[]
getMember(db, memberId): GroupMember | null
removeMember(db, memberId): void
updateMember(db, memberId, ...): void
updateMemberStatus(db, memberId, status): void
updateMemberSession(db, memberId, sessionId, initialized): void

// 消息操作
createMessage(db, groupId, senderType, senderName, content, mentions): Message
listMessages(db, groupId, limit): Message[]
clearGroupMessages(db, groupId): void
```

## 启动流程

```typescript
// server.ts
1. 初始化数据库 (initDb)
2. 创建 Hono 应用
3. 注册 API 路由
4. 配置静态文件服务
5. 启动 HTTP 服务
6. 设置 WebSocket 服务
7. 注册关闭钩子 (SIGINT, SIGTERM)
```

## 配置

### 环境变量

无需环境变量，所有配置通过命令行参数传入:

```bash
opencode-web --port 8080 --directory /path/to/project
```

### 默认值

- 端口: 3000
- 项目目录: 当前目录
- 数据库: `~/.omo/web/web.db`

## 扩展点

### 添加新的 API 端点

1. 在 `src/api/` 创建新路由文件
2. 在 `src/api/index.ts` 注册路由
3. 在 `src/utils/validation.ts` 添加验证函数

### 添加新的消息类型

1. 在 `src/ws/types.ts` 定义类型
2. 在 `src/ws/handler.ts` 添加处理逻辑
3. 在前端实现对应处理

### 自定义 Agent 行为

通过 `rolePrompt` 字段注入自定义提示词:

```json
{
  "rolePrompt": "你是测试专家，负责编写单元测试和集成测试。你的工作需要向项目主管汇报。"
}
```

## 性能优化

- SQLite 使用 WAL 模式提升并发性能
- WebSocket 连接数限制防止资源耗尽
- 心跳检测自动清理断线连接
- Session 复用减少创建开销
- 流式输出降低首字延迟

## 安全考虑

- 输入验证防止 SQL 注入
- 路径验证防止目录遍历
- 连接数限制防止 DoS
- 项目路径隔离防止跨项目访问
