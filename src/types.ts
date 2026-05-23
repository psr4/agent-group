export type Group = {
  id: string
  name: string
  projectPath: string
  createdAt: string
}

export type GroupMember = {
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
  description?: string
  color: string
}
