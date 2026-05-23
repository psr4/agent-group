import { Hono } from "hono"
import { getDb } from "../db/index.js"
import { 
  createGroup, listGroups, getGroup, deleteGroup, 
  addMember, removeMember, listMembers, updateMember, getMember, 
  createMessage, listMessages,
  clearGroupMessages, clearGroupSessions, deleteGroupMembers, deleteGroupMessages
} from "../db/queries.js"
import { validateString, validateProjectPath, validateArray, validateOneOf } from "../utils/validation.js"
import { NotFoundError, BadRequestError } from "../utils/errors.js"
import { closeSession, closeGroupSessions } from "../session/manager.js"

const app = new Hono()

app.get("/", (c) => {
  const db = getDb()
  const groups = listGroups(db)
  return c.json(groups)
})

app.post("/", async (c) => {
  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    throw new BadRequestError("Invalid JSON")
  }
  
  const name = validateString((body as { name?: string }).name, "name", 255)
  const projectPath = validateProjectPath((body as { projectPath?: string }).projectPath || "")
  
  const db = getDb()
  const group = createGroup(db, name, projectPath)
  return c.json(group, 201)
})

app.get("/:id", (c) => {
  const id = c.req.param("id")
  const db = getDb()
  const group = getGroup(db, id)
  if (!group) {
    throw new NotFoundError("Group not found")
  }
  return c.json(group)
})

app.delete("/:id", (c) => {
  const id = c.req.param("id")
  const db = getDb()
  
  // 先关闭内存中的 sessions
  closeGroupSessions(id)
  
  // 删除数据库数据
  deleteGroupMessages(db, id)
  deleteGroupMembers(db, id)
  deleteGroup(db, id)
  
  return c.json({ success: true })
})

app.patch("/:id", async (c) => {
  const id = c.req.param("id")
  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    throw new BadRequestError("Invalid JSON")
  }
  
  const typedBody = body as { name?: string; projectPath?: string }
  const db = getDb()
  
  if (typedBody.name !== undefined) {
    const name = validateString(typedBody.name, "name", 255)
    db.prepare("UPDATE groups SET name = ? WHERE id = ?").run(name, id)
  }
  if (typedBody.projectPath !== undefined) {
    const projectPath = validateProjectPath(typedBody.projectPath)
    db.prepare("UPDATE groups SET project_path = ? WHERE id = ?").run(projectPath, id)
  }
  
  const group = getGroup(db, id)
  if (!group) {
    throw new NotFoundError("Group not found")
  }
  return c.json(group)
})

app.get("/:id/members", (c) => {
  const id = c.req.param("id")
  const db = getDb()
  const members = listMembers(db, id)
  return c.json(members)
})

app.post("/:id/members", async (c) => {
  const groupId = c.req.param("id")
  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    throw new BadRequestError("Invalid JSON")
  }
  
  const typedBody = body as { agentName?: string; displayName?: string; rolePrompt?: string; model?: string; bubbleColor?: string }
  const agentName = validateString(typedBody.agentName, "agentName", 255)
  const displayName = validateString(typedBody.displayName, "displayName", 255)
  const rolePrompt = typedBody.rolePrompt !== undefined ? validateString(typedBody.rolePrompt, "rolePrompt", 4096) : undefined
  const model = typedBody.model !== undefined ? validateString(typedBody.model, "model", 255) : undefined
  const bubbleColor = typedBody.bubbleColor !== undefined ? validateString(typedBody.bubbleColor, "bubbleColor", 50) : undefined
  
  const db = getDb()
  const member = addMember(db, groupId, agentName, displayName, rolePrompt, model, bubbleColor)
  return c.json(member, 201)
})

app.delete("/:id/members/:memberId", (c) => {
  const memberId = c.req.param("memberId")
  
  // 关闭内存中的 session
  closeSession(memberId)
  
  const db = getDb()
  removeMember(db, memberId)
  return c.json({ success: true })
})

app.patch("/:id/members/:memberId", async (c) => {
  const memberId = c.req.param("memberId")
  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    throw new BadRequestError("Invalid JSON")
  }
  
  const typedBody = body as { displayName?: string; rolePrompt?: string; model?: string; bubbleColor?: string }
  const displayName = typedBody.displayName !== undefined ? validateString(typedBody.displayName, "displayName", 255) : undefined
  const rolePrompt = typedBody.rolePrompt !== undefined ? validateString(typedBody.rolePrompt, "rolePrompt", 4096) : undefined
  const model = typedBody.model !== undefined ? validateString(typedBody.model, "model", 255) : undefined
  const bubbleColor = typedBody.bubbleColor !== undefined ? validateString(typedBody.bubbleColor, "bubbleColor", 50) : undefined
  
  const db = getDb()
  updateMember(db, memberId, displayName, rolePrompt, model, bubbleColor)
  
  return c.json({ success: true })
})

app.get("/:id/members/:memberId", (c) => {
  const memberId = c.req.param("memberId")
  const db = getDb()
  const member = getMember(db, memberId)
  if (!member) {
    throw new NotFoundError("Member not found")
  }
  return c.json(member)
})

app.get("/:id/messages", (c) => {
  const groupId = c.req.param("id")
  const limit = parseInt(c.req.query("limit") || "100")
  const db = getDb()
  const messages = listMessages(db, groupId, limit)
  return c.json(messages)
})

app.post("/:id/messages", async (c) => {
  const groupId = c.req.param("id")
  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    throw new BadRequestError("Invalid JSON")
  }
  
  const typedBody = body as {
    senderType?: string
    senderName?: string
    content?: string
    mentions?: unknown[]
  }
  
  const senderType = validateOneOf(
    validateString(typedBody.senderType, "senderType", 50),
    ["user", "agent"],
    "senderType"
  )
  const senderName = validateString(typedBody.senderName, "senderName", 255)
  const content = validateString(typedBody.content, "content", 100000)
  const mentions = validateArray(typedBody.mentions, "mentions")
    .filter((m): m is string => typeof m === "string")
    .map(m => validateString(m, "mention", 255))
  
  const db = getDb()
  const message = createMessage(db, groupId, senderType, senderName, content, mentions)
  return c.json(message, 201)
})

app.delete("/:id/messages", (c) => {
  const groupId = c.req.param("id")
  const db = getDb()
  
  // 清空消息
  clearGroupMessages(db, groupId)
  
  // 重置所有成员的 session
  clearGroupSessions(db, groupId)
  
  // 关闭内存中的 sessions
  closeGroupSessions(groupId)
  
  return c.json({ success: true })
})

export default app
