import type { Group, Agent, Message } from "../types"

export async function fetchGroups(): Promise<Group[]> {
  const res = await fetch("/api/groups")
  return res.json()
}

export async function createGroup(name: string, projectPath: string): Promise<Group> {
  const res = await fetch("/api/groups", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, projectPath }),
  })
  return res.json()
}

export async function fetchAgents(): Promise<Agent[]> {
  const res = await fetch("/api/agents")
  return res.json()
}

export async function fetchMessages(groupId: string): Promise<Message[]> {
  const res = await fetch(`/api/groups/${groupId}/messages`)
  return res.json()
}
