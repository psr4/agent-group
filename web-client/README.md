# Web Client - 前端应用

基于 React 19 + TypeScript + Vite 构建的群聊管理前端应用。

## 技术栈

- **React 19** - UI 框架
- **TypeScript** - 类型安全
- **Vite 6** - 构建工具
- **WebSocket** - 实时通信

## 项目结构

```
src/
├── main.tsx                 # 应用入口
├── App.tsx                  # 根组件，状态管理
├── App.css                  # 全局样式
├── types.ts                 # TypeScript 类型定义
├── components/              # UI 组件
│   ├── MessageList.tsx      # 消息列表展示
│   ├── MessageInput.tsx     # 消息输入框（支持 @ 提及）
│   ├── RightPanel.tsx       # 右侧面板（群列表 + 成员列表）
│   ├── CreateGroupModal.tsx # 创建群弹窗
│   ├── ErrorBoundary.tsx    # 错误边界
│   └── Toast.tsx            # Toast 提示
└── hooks/                   # 自定义 Hooks
    ├── useWebSocket.ts      # WebSocket 连接管理
    └── useApi.ts            # API 请求封装
```

## 核心组件说明

### App.tsx
主应用组件，负责：
- 全局状态管理（群列表、成员、消息、Agent 状态）
- WebSocket 消息处理
- API 调用封装

### MessageList.tsx
消息列表组件：
- 展示用户和 Agent 消息
- 支持 `<replay>` 标签解析（显示为 @提及 格式）
- 不同发送者不同气泡颜色

### MessageInput.tsx
消息输入组件：
- 支持 `@` 触发成员提及下拉菜单
- 键盘导航（↑↓ 选择，Tab/Enter 确认）
- 中文输入法兼容处理

### RightPanel.tsx
右侧面板组件：
- 群列表管理（新建、编辑、删除、清空消息）
- 群成员管理（添加、编辑、删除、右键 @提及）
- 成员状态显示（idle/working/error）

### CreateGroupModal.tsx
创建群弹窗：
- 输入群名称
- 设置项目路径

## 类型定义 (types.ts)

```typescript
Group         // 群信息
Agent         // Agent 配置
Model         // 模型信息
GroupMember   // 群成员
Message       // 消息
WsMessage     // WebSocket 消息类型
```

## WebSocket 通信

使用 `useWebSocket` Hook 管理 WebSocket 连接：
- 自动重连（指数退避，最多 5 次）
- 消息类型：`user_message`、`agent_message`、`agent_status`

## 开发命令

```bash
npm run dev      # 启动开发服务器
npm run build    # 构建生产版本
npm run preview  # 预览生产构建
```

## 特性

- 实时消息推送
- @ 提及功能（支持 @所有人）
- Agent 工作状态实时显示
- 群/成员 CRUD 操作
- 错误边界保护
- Toast 提示反馈
