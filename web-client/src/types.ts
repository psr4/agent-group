export type Group = {
  id: string
  name: string
  projectPath: string
  createdAt: string
}

export type Agent = {
  name: string
  description?: string
  color: string
}

export type Model = {
  id: string
  name: string
  provider: string
}

export type GroupMember = {
  id: string
  groupId: string
  agentName: string
  displayName: string
  sessionId: string
  status: "idle" | "working" | "error"
  rolePrompt?: string
  model?: string
  bubbleColor: string
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
  | { type: "agent_message"; groupId: string; memberId: string; agentName: string; content: string }
  | { type: "agent_status"; groupId: string; memberId: string; agentName: string; status: "idle" | "working" | "error" }
  | { type: "agent_interrupted"; groupId: string; memberId: string; agentName: string }
