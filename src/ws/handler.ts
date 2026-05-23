import type { WebSocket } from "ws"
import type { WsMessage } from "./types.js"
import { getDb } from "../db/index.js"
import { createMessage, getGroup, listMembers } from "../db/queries.js"
import { sendToAgent, setBroadcast } from "../session/index.js"

const connections = new Map<string, Set<WebSocket>>()
const MAX_CONNECTIONS_PER_GROUP = 100
const MAX_TOTAL_CONNECTIONS = 1000
let totalConnections = 0

const clientLastSeen = new WeakMap<WebSocket, number>()
const HEARTBEAT_INTERVAL_MS = 30000
const HEARTBEAT_TIMEOUT_MS = 60000

setInterval(() => {
  const now = Date.now()
  for (const [groupId, conns] of connections) {
    for (const ws of conns) {
      const lastSeen = clientLastSeen.get(ws) || 0
      if (now - lastSeen > HEARTBEAT_TIMEOUT_MS) {
        console.log(`Closing stale WebSocket connection for group ${groupId}`)
        ws.terminate()
      }
    }
  }
}, HEARTBEAT_INTERVAL_MS).unref()

setBroadcast((groupId: string, message: WsMessage) => {
  broadcast(groupId, message)
})

export function handleOpen(ws: WebSocket, groupId: string): void {
  if (totalConnections >= MAX_TOTAL_CONNECTIONS) {
    ws.send(JSON.stringify({ type: "error", error: "Too many connections" }))
    ws.close()
    return
  }
  
  if (!connections.has(groupId)) {
    connections.set(groupId, new Set())
  }
  
  const groupConns = connections.get(groupId)!
  if (groupConns.size >= MAX_CONNECTIONS_PER_GROUP) {
    ws.send(JSON.stringify({ type: "error", error: "Too many connections for this group" }))
    ws.close()
    return
  }
  
  groupConns.add(ws)
  totalConnections++
  clientLastSeen.set(ws, Date.now())
  
  ws.on("pong", () => {
    clientLastSeen.set(ws, Date.now())
  })
}

export function handleClose(ws: WebSocket, groupId: string): void {
  const groupConns = connections.get(groupId)
  if (groupConns) {
    if (groupConns.delete(ws)) {
      totalConnections--
    }
  }
}

export async function handleMessage(
  ws: WebSocket,
  message: string,
  groupId: string
): Promise<void> {
  let parsed: WsMessage
  try {
    parsed = JSON.parse(message) as WsMessage
  } catch (e) {
    console.error("Failed to parse WebSocket message:", e)
    ws.send(JSON.stringify({ type: "error", error: "Invalid JSON format" }))
    return
  }
  
  if (!parsed || typeof parsed.type !== "string") {
    ws.send(JSON.stringify({ type: "error", error: "Invalid message format" }))
    return
  }
  
  if (parsed.type === "user_message") {
    const db = getDb()
    const msg = createMessage(db, groupId, "user", "你", parsed.content, parsed.mentions)
    
    broadcast(groupId, {
      type: "user_message",
      groupId,
      content: msg.content,
      mentions: msg.mentions,
    })
    
    const group = getGroup(db, groupId)
    if (!group) {
      console.error(`Group ${groupId} not found`)
      return
    }
    
    const members = listMembers(db, groupId)
    const targetMemberIds: string[] = []
    
    // 解析 mentions，找到对应的 member id
    for (const mention of parsed.mentions) {
      if (mention === "所有人" || mention === "all") {
        // @所有人 - 添加所有成员
        for (const m of members) {
          targetMemberIds.push(m.id)
        }
      } else {
        // 根据 displayName 找到对应的 member
        const member = members.find(m => m.displayName === mention)
        if (member) {
          targetMemberIds.push(member.id)
        }
      }
    }
    
    // 去重
    const uniqueMemberIds = [...new Set(targetMemberIds)]
    
    for (const memberId of uniqueMemberIds) {
      sendToAgent(memberId, parsed.content, group.projectPath).catch(console.error)
    }
  }
}

export function broadcast(groupId: string, message: WsMessage): void {
  const conns = connections.get(groupId)
  if (conns) {
    const data = JSON.stringify(message)
    for (const ws of conns) {
      if (ws.readyState === ws.OPEN) {
        ws.send(data)
      }
    }
  }
}
