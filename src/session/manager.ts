import { createOpencode } from "@opencode-ai/sdk"
import type { WsMessage } from "../ws/types.js"
import { getDb } from "../db/index.js"
import { updateMemberStatus, listMembers, getMember, createMessage, updateMemberSession } from "../db/queries.js"
import type { GroupMember } from "../types.js"
import type { GlobalEvent } from "./events.js"
import { 
  isSessionIdleEvent, 
  isMessagePartUpdatedEvent, 
  isSessionErrorEvent, 
  getSessionError,
  getMessageText,
  getMessageId
} from "./events.js"

type AgentSession = {
  memberId: string
  groupId: string
  agentName: string
  displayName: string
  sessionId: string
  client: Awaited<ReturnType<typeof createOpencode>>["client"]
  abortController: AbortController
  status: "idle" | "working" | "error"
  initialized: boolean
}

type OpenCodeClient = Awaited<ReturnType<typeof createOpencode>>["client"]

const sessions = new Map<string, AgentSession>()
const clients = new Map<string, { client: OpenCodeClient; abortController: AbortController }>()
let broadcastFn: ((groupId: string, message: WsMessage) => void) | null = null

export function setBroadcast(fn: (groupId: string, message: WsMessage) => void): void {
  broadcastFn = fn
}

function broadcast(groupId: string, message: WsMessage): void {
  if (broadcastFn) {
    broadcastFn(groupId, message)
  }
}

export async function getOrCreateSession(
  member: GroupMember,
  projectPath: string
): Promise<AgentSession> {
  console.log(`getOrCreateSession called: member.id=${member.id}, displayName=${member.displayName}`)
  
  const existing = sessions.get(member.id)
  
  if (existing) {
    console.log(`Reusing existing session for ${member.displayName}, sessionId=${existing.sessionId}`)
    return existing
  }
  
  const db = getDb()
  const dbMember = getMember(db, member.id)
  const savedSessionId = dbMember?.sessionId
  const wasInitialized = dbMember?.sessionInitialized ?? false
  
  const abortController = new AbortController()
  
  // 创建新的 OpenCode client
  const { client } = await createOpencode({
    signal: abortController.signal,
    port: 0,
    hostname: "127.0.0.1",
  })
  
  // 尝试复用已有的 session
  let sessionId: string
  let initialized = wasInitialized
  
  if (savedSessionId) {
    try {
      console.log(`Trying to reuse saved session: ${savedSessionId}`)
      const sessionRes = await client.session.get({
        path: { id: savedSessionId }
      })
      if (sessionRes.data) {
        sessionId = savedSessionId
        console.log(`Reused existing OpenCode session: ${sessionId}`)
      } else {
        throw new Error("Session not found")
      }
    } catch (e) {
      console.log(`Failed to reuse session ${savedSessionId}, creating new one`)
      const sessionRes = await client.session.create({
        query: { directory: projectPath },
      })
      if (!sessionRes.data) {
        throw new Error("Failed to create session")
      }
      sessionId = sessionRes.data.id
      initialized = false
    }
  } else {
    console.log(`Creating new OpenCode session for ${member.displayName}`)
    const sessionRes = await client.session.create({
      query: { directory: projectPath },
    })
    if (!sessionRes.data) {
      throw new Error("Failed to create session")
    }
    sessionId = sessionRes.data.id
    initialized = false
  }
  
  const agentSession: AgentSession = {
    memberId: member.id,
    groupId: member.groupId,
    agentName: member.agentName,
    displayName: member.displayName,
    sessionId,
    client,
    abortController,
    status: "idle",
    initialized,
  }
  
  sessions.set(member.id, agentSession)
  
  updateMemberSession(db, member.id, sessionId, initialized)
  updateMemberStatus(db, member.id, "idle")
  
  console.log(`Session ready: ${sessionId} for ${member.displayName}, initialized=${initialized}`)
  
  return agentSession
}

export function getSession(memberId: string): AgentSession | undefined {
  return sessions.get(memberId)
}

export function setSessionStatus(memberId: string, status: "idle" | "working" | "error"): void {
  const session = sessions.get(memberId)
  if (session) {
    session.status = status
    const db = getDb()
    updateMemberStatus(db, memberId, status)
  }
}

export async function interruptSession(memberId: string): Promise<void> {
  const session = sessions.get(memberId)
  if (session) {
    try {
      await session.client.session.abort({
        path: { id: session.sessionId },
      })
    } catch (e) {
      console.error("Failed to abort session:", e)
    }
    setSessionStatus(memberId, "idle")
  }
}

export function closeSession(memberId: string): void {
  const session = sessions.get(memberId)
  if (session) {
    session.abortController.abort()
    sessions.delete(memberId)
  }
}

export function closeGroupSessions(groupId: string): void {
  for (const [memberId, session] of sessions) {
    if (session.groupId === groupId) {
      session.abortController.abort()
      sessions.delete(memberId)
    }
  }
}

export function closeAllSessions(): void {
  for (const session of sessions.values()) {
    session.abortController.abort()
  }
  sessions.clear()
}

function buildPrompt(
  member: GroupMember,
  content: string,
  projectPath: string,
  fromMember?: GroupMember
): string {
  const db = getDb()
  const members = listMembers(db, member.groupId)
  
  const otherMembers = members.filter(m => m.id !== member.id)
  const memberList = otherMembers.map(m => m.displayName).join(', ')
  
  let prompt = `你是群聊中的 "${member.displayName}" agent。

## 群聊信息
- 群ID: ${member.groupId}
- 项目路径: ${projectPath}
- 群内其他成员: ${memberList || '(无其他成员)'}

## 重要规则
- 你只能看到发给你 (@${member.displayName}) 的消息
- 其他 agent 看不到此对话，各自独立工作
- 如果需要回复用户，使用 <replay master="true">消息内容</replay>
- 如果需要和其他 agent 协作，使用 <replay to="成员名">消息内容</replay>
- 如果要同时发给多个成员，使用 <replay to="成员1,成员2,成员3">消息内容</replay>
- 可以同时使用 master 和 to，例如 <replay to="成员1,成员2" master="true">消息内容</replay>
- 你的回复会实时显示在群里
- 如果是其他 agent 给你分配任务，完成任务后用 <replay to="分配者名">回复内容</replay> 告知结果

`
  
  if (member.rolePrompt) {
    prompt += `## 你的角色
${member.rolePrompt}

`
  }
  
  if (fromMember) {
    prompt += `## 来自其他 agent 的消息
${fromMember.displayName} 在群里 @了你：

`
  }
  
  prompt += `## 用户消息
${content}`

  return prompt
}

export async function sendToAgent(
  memberId: string,
  content: string,
  projectPath: string,
  fromMember?: GroupMember
): Promise<void> {
  try {
    const db = getDb()
    const member = getMember(db, memberId)
    
    if (!member) {
      throw new Error(`Member ${memberId} not found`)
    }
    
    const session = getSession(memberId)
    
    if (session?.status === "working") {
      await interruptSession(memberId)
      broadcast(member.groupId, { type: "agent_interrupted", groupId: member.groupId, memberId: member.id, agentName: member.displayName })
    }
    
    const agentSession = await getOrCreateSession(member, projectPath)
    setSessionStatus(memberId, "working")
    broadcast(member.groupId, { type: "agent_status", groupId: member.groupId, memberId: member.id, agentName: member.displayName, status: "working" })
    
    // 只有首次发送完整系统提示
    let prompt: string
    if (agentSession.initialized) {
      // 后续消息只发送用户消息
      if (fromMember) {
        prompt = `${fromMember.displayName} 给你分配了任务：\n\n${content}`
      } else {
        prompt = content
      }
    } else {
      // 首次发送完整系统提示
      prompt = buildPrompt(member, content, projectPath, fromMember)
      agentSession.initialized = true
      // 更新数据库
      const dbInit = getDb()
      updateMemberSession(dbInit, member.id, agentSession.sessionId, true)
    }
    
    console.log(`Sending prompt to ${member.displayName}:\n${prompt}`)
    
    const events = await agentSession.client.global.event()
    
    let fullResponse = ""
    let allResponses: string[] = []
    let userMessageId: string | null = null
    let assistantMessages: string[] = []
    let done = false
    let doneResolve: () => void
    const donePromise = new Promise<void>((resolve) => {
      doneResolve = resolve
    })
    
    const eventHandler = async () => {
      try {
        for await (const event of events.stream) {
          if (done) break
          
          const globalEvent: GlobalEvent = event as GlobalEvent
          
          if (!globalEvent.payload) continue
          
          if (isSessionIdleEvent(globalEvent, agentSession.sessionId)) {
            console.log(`Session ${agentSession.sessionId} is idle`)
            done = true
            doneResolve()
            break
          }
          
          if (isMessagePartUpdatedEvent(globalEvent, agentSession.sessionId)) {
            const text = getMessageText(globalEvent)
            const messageId = getMessageId(globalEvent)
            
            if (!text) continue
            
            // 跳过用户消息（text 等于 prompt 的那条）
            if (text === prompt && !userMessageId) {
              userMessageId = messageId || "unknown"
              console.log(`Skipping user message part, messageId=${userMessageId}`)
              continue
            }
            
            // 跳过和用户消息相同 messageId 的内容
            if (messageId === userMessageId) {
              continue
            }
            
            // 这是 assistant 的回复
            // 累积所有 assistant 消息
            if (!assistantMessages.includes(messageId || "unknown")) {
              assistantMessages.push(messageId || "unknown")
              console.log(`New assistant message part, messageId=${messageId}`)
              allResponses.push(text)
            }
            
            fullResponse = text
            broadcast(member.groupId, {
              type: "agent_message",
              groupId: member.groupId,
              memberId: member.id,
              agentName: member.displayName,
              content: fullResponse,
            })
          }
          
          if (isSessionErrorEvent(globalEvent, agentSession.sessionId)) {
            const errorMsg = getSessionError(globalEvent) || "Session error"
            console.error(`Session error:`, errorMsg)
            throw new Error(errorMsg)
          }
        }
        } catch (e) {
          if (!done) {
            const errorDetails = e instanceof Error ? e.message : String(e)
            console.error("Event handler error:", errorDetails, e)
          }
      }
    }
    
    eventHandler().catch(console.error)
    
    const promptBody: {
      agent: string
      parts: { type: "text"; text: string }[]
      tools: { question: boolean }
      model?: { providerID: string; modelID: string }
    } = {
      agent: member.agentName,
      parts: [{ type: "text", text: prompt }],
      tools: { question: false },
    }
    
    if (member.model) {
      const [providerID, modelID] = member.model.split("/")
      promptBody.model = { providerID, modelID }
    }
    
    await agentSession.client.session.promptAsync({
      path: { id: agentSession.sessionId },
      body: promptBody,
      query: { directory: projectPath },
    })
    
    while (!done) {
      await Promise.race([
        donePromise,
        new Promise<void>((r) => setTimeout(r, 5000)),
      ])
    }
    
    setSessionStatus(memberId, "idle")
    broadcast(member.groupId, { type: "agent_status", groupId: member.groupId, memberId: member.id, agentName: member.displayName, status: "idle" })
    
    // 保存所有 agent 消息到数据库
    if (allResponses.length > 0) {
      const dbSave = getDb()
      for (const response of allResponses) {
        createMessage(dbSave, member.groupId, "agent", member.displayName, response, [])
      }
      console.log(`Saved ${allResponses.length} agent messages from ${member.displayName}`)
    } else if (fullResponse) {
      const dbSave = getDb()
      createMessage(dbSave, member.groupId, "agent", member.displayName, fullResponse, [])
      console.log(`Saved agent message from ${member.displayName}:`)
      console.log(fullResponse)
    } else {
      console.log(`No response to save for ${member.displayName}`)
    }
    
    // 解析 agent 回复中的 <replay> 标签
    // 从所有消息中查找 replay 标签
    const replaySource = allResponses.length > 0 ? allResponses.join("\n") : fullResponse
    if (replaySource) {
      const allMembers = listMembers(db, member.groupId)
      
      // 匹配所有 <replay> 标签，支持任意属性顺序
      // 格式: <replay ...>content</replay>
      const replayRegex = /<replay\s+([^>]*)>([\s\S]*?)<\/replay>/g
      let match: RegExpExecArray | null
      
      while ((match = replayRegex.exec(replaySource)) !== null) {
        const attrs = match[1]
        const replayContent = match[2].trim()
        
        // 解析属性
        const toMatch = attrs.match(/to="([^"]+)"/)
        const isMaster = attrs.includes('master="true"')
        const targetNames = toMatch ? toMatch[1].split(',').map(n => n.trim()).filter(n => n) : []
        
        console.log(`Found replay: master=${isMaster}, to=${targetNames.join(',')}`)
        
        if (isMaster) {
          console.log(`Replay to master (user):`)
          console.log(replayContent)
        }
        
        if (targetNames.length > 0) {
          console.log(`Target members: ${targetNames.join(', ')}`)
          for (const name of targetNames) {
            const mentionedMember = allMembers.find(m => m.displayName === name && m.id !== member.id)
            if (mentionedMember) {
              console.log(`Triggering agent: ${mentionedMember.displayName} (${mentionedMember.id})`)
              sendToAgent(mentionedMember.id, replayContent, projectPath, member).catch(console.error)
            } else {
              console.log(`Member not found: ${name}, all members: ${allMembers.map(m => m.displayName).join(', ')}`)
            }
          }
        }
      }
    }
    
  } catch (error) {
    const db = getDb()
    const member = getMember(db, memberId)
    const groupId = member?.groupId || ""
    const displayName = member?.displayName || memberId
    
    console.error(`Agent ${displayName} error:`, error)
    setSessionStatus(memberId, "error")
    broadcast(groupId, { type: "agent_status", groupId, memberId, agentName: displayName, status: "error" })
    broadcast(groupId, {
      type: "agent_message",
      groupId,
      memberId,
      agentName: displayName,
      content: `错误: ${error instanceof Error ? error.message : "未知错误"}`,
    })
  }
}
