import Database from "better-sqlite3"
import type { Group, GroupMember, Message } from "../types"
import { randomUUID } from "node:crypto"
import { toMemberStatus, toSenderType, toMessageStatus } from "../types/guards.js"

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

export function addMember(db: Database.Database, groupId: string, agentName: string, displayName: string, rolePrompt?: string, model?: string, bubbleColor?: string): GroupMember {
  const id = randomUUID()
  
  db.prepare(`
    INSERT INTO group_members (id, group_id, agent_name, display_name, status, role_prompt, model, bubble_color, session_initialized)
    VALUES (?, ?, ?, ?, 'idle', ?, ?, ?, 0)
  `).run(id, groupId, agentName, displayName, rolePrompt || null, model || null, bubbleColor || '#0096ff')
  
  return {
    id,
    groupId,
    agentName,
    displayName,
    sessionId: undefined,
    sessionInitialized: false,
    status: "idle",
    rolePrompt,
    model,
    bubbleColor: bubbleColor || '#0096ff',
  }
}

export function listMembers(db: Database.Database, groupId: string): GroupMember[] {
  const rows = db.prepare(`
    SELECT id, group_id, agent_name, display_name, session_id, session_initialized, status, role_prompt, model, bubble_color
    FROM group_members WHERE group_id = ?
    ORDER BY created_at ASC
  `).all(groupId) as Array<{ 
    id: string
    group_id: string
    agent_name: string
    display_name: string
    session_id: string | null
    session_initialized: number
    status: string
    role_prompt: string | null
    model: string | null
    bubble_color: string | null
  }>
  
  return rows.map((row) => ({
    id: row.id,
    groupId: row.group_id,
    agentName: row.agent_name,
    displayName: row.display_name,
    sessionId: row.session_id || undefined,
    sessionInitialized: row.session_initialized === 1,
    status: row.status as "idle" | "working" | "error",
    rolePrompt: row.role_prompt || undefined,
    model: row.model || undefined,
    bubbleColor: row.bubble_color || '#0096ff',
  }))
}

export function getMember(db: Database.Database, memberId: string): GroupMember | null {
  const row = db.prepare(`
    SELECT id, group_id, agent_name, display_name, session_id, session_initialized, status, role_prompt, model, bubble_color
    FROM group_members WHERE id = ?
  `).get(memberId) as { 
    id: string
    group_id: string
    agent_name: string
    display_name: string
    session_id: string | null
    session_initialized: number
    status: string
    role_prompt: string | null
    model: string | null
    bubble_color: string | null
  } | undefined
  
  if (!row) return null
  
  return {
    id: row.id,
    groupId: row.group_id,
    agentName: row.agent_name,
    displayName: row.display_name,
    sessionId: row.session_id || undefined,
    sessionInitialized: row.session_initialized === 1,
    status: toMemberStatus(row.status),
    rolePrompt: row.role_prompt || undefined,
    model: row.model || undefined,
    bubbleColor: row.bubble_color || '#0096ff',
  }
}

export function removeMember(db: Database.Database, memberId: string): void {
  db.prepare("DELETE FROM group_members WHERE id = ?").run(memberId)
}

export function updateMemberStatus(db: Database.Database, memberId: string, status: "idle" | "working" | "error"): void {
  db.prepare(`
    UPDATE group_members SET status = ?
    WHERE id = ?
  `).run(status, memberId)
}

export function updateMember(db: Database.Database, memberId: string, displayName?: string, rolePrompt?: string, model?: string, bubbleColor?: string): void {
  db.prepare(`
    UPDATE group_members 
    SET display_name = ?, role_prompt = ?, model = ?, bubble_color = ?
    WHERE id = ?
  `).run(displayName || null, rolePrompt || null, model || null, bubbleColor || null, memberId)
}

export function updateMemberSession(db: Database.Database, memberId: string, sessionId: string | null, initialized: boolean): void {
  db.prepare(`
    UPDATE group_members 
    SET session_id = ?, session_initialized = ?
    WHERE id = ?
  `).run(sessionId, initialized ? 1 : 0, memberId)
}

export function clearGroupMessages(db: Database.Database, groupId: string): void {
  db.prepare("DELETE FROM messages WHERE group_id = ?").run(groupId)
}

export function clearGroupSessions(db: Database.Database, groupId: string): void {
  db.prepare(`
    UPDATE group_members 
    SET session_initialized = 0, status = 'idle'
    WHERE group_id = ?
  `).run(groupId)
}

export function deleteGroupMembers(db: Database.Database, groupId: string): void {
  db.prepare("DELETE FROM group_members WHERE group_id = ?").run(groupId)
}

export function deleteGroupMessages(db: Database.Database, groupId: string): void {
  db.prepare("DELETE FROM messages WHERE group_id = ?").run(groupId)
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
    senderType: toSenderType(row.sender_type),
    senderName: row.sender_name,
    content: row.content,
    mentions: JSON.parse(row.mentions || "[]"),
    status: toMessageStatus(row.status),
    createdAt: row.created_at,
  }))
}
