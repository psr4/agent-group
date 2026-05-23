export type WsMessage =
  | { type: "user_message"; groupId: string; content: string; mentions: string[] }
  | { type: "agent_message"; groupId: string; memberId: string; agentName: string; content: string }
  | { type: "agent_status"; groupId: string; memberId: string; agentName: string; status: "idle" | "working" | "error" }
  | { type: "agent_interrupted"; groupId: string; memberId: string; agentName: string }
