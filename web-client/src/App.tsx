import { useState, useEffect, useRef } from "react"
import type { Group, Agent, Message, GroupMember, Model } from "./types"
import MessageList from "./components/MessageList"
import MessageInput from "./components/MessageInput"
import CreateGroupModal from "./components/CreateGroupModal"
import RightPanel from "./components/RightPanel"
import { useWebSocket } from "./hooks/useWebSocket"
import { useToast, ToastProvider } from "./components/Toast"
import ErrorBoundary from "./components/ErrorBoundary"

function AppContent() {
  const { showError } = useToast()
  const [groups, setGroups] = useState<Group[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [models, setModels] = useState<Model[]>([])
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [members, setMembers] = useState<GroupMember[]>([])
  const [agentStatus, setAgentStatus] = useState<Record<string, "idle" | "working" | "error">>({})
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [mentionTarget, setMentionTarget] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  const selectedGroup = groups.find(g => g.id === selectedGroupId)

  const { sendMessage } = useWebSocket(selectedGroupId, (msg) => {
    if (msg.type === "user_message") {
      setMessages((prev) => [...prev, {
        id: crypto.randomUUID(),
        groupId: msg.groupId,
        senderType: "user",
        senderName: "你",
        content: msg.content,
        mentions: msg.mentions,
        status: "completed",
        createdAt: new Date().toISOString(),
      }])
    } else if (msg.type === "agent_message") {
      setMessages((prev) => [...prev, {
        id: crypto.randomUUID(),
        groupId: msg.groupId,
        senderType: "agent",
        senderName: msg.agentName,
        content: msg.content,
        mentions: [],
        status: "completed",
        createdAt: new Date().toISOString(),
      }])
    } else if (msg.type === "agent_status") {
      setAgentStatus((prev) => ({ ...prev, [msg.memberId]: msg.status }))
    }
    
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, 50)
  })

  useEffect(() => {
    fetch("/api/groups")
      .then((res) => res.json())
      .then(setGroups)
      .catch(() => showError("获取群列表失败"))

    fetch("/api/agents")
      .then((res) => res.json())
      .then(setAgents)
      .catch(() => showError("获取 Agent 列表失败"))

    fetch("/api/models")
      .then((res) => res.json())
      .then(setModels)
      .catch(() => showError("获取模型列表失败"))
  }, [showError])

  useEffect(() => {
    if (selectedGroupId) {
      fetch(`/api/groups/${selectedGroupId}/messages`)
        .then((res) => res.json())
        .then(setMessages)
        .catch(() => showError("获取消息失败"))
      
      fetch(`/api/groups/${selectedGroupId}/members`)
        .then((res) => res.json())
        .then((data: GroupMember[]) => {
          setMembers(data)
          const status: Record<string, "idle" | "working" | "error"> = {}
          data.forEach(m => { status[m.id] = m.status })
          setAgentStatus(status)
        })
        .catch(() => showError("获取成员列表失败"))
    }
  }, [selectedGroupId, showError])

  const handleSendMessage = (content: string, mentions: string[]) => {
    if (selectedGroupId) {
      sendMessage({ type: "user_message", groupId: selectedGroupId, content, mentions })
    }
  }

  const handleCreateGroup = async (name: string, projectPath: string) => {
    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, projectPath }),
      })
      if (!res.ok) throw new Error()
      const group = await res.json()
      setGroups((prev) => [group, ...prev])
      setSelectedGroupId(group.id)
      setShowCreateModal(false)
    } catch {
      showError("创建群失败")
    }
  }

  const handleDeleteGroup = async (id: string) => {
    try {
      await fetch(`/api/groups/${id}`, { method: "DELETE" })
      setGroups((prev) => prev.filter(g => g.id !== id))
      if (selectedGroupId === id) {
        setSelectedGroupId(null)
        setMessages([])
        setMembers([])
      }
    } catch {
      showError("删除群失败")
    }
  }

  const handleClearMessages = async (groupId: string) => {
    try {
      await fetch(`/api/groups/${groupId}/messages`, { method: "DELETE" })
      setMessages([])
      setAgentStatus({})
    } catch {
      showError("清空消息失败")
    }
  }

  const handleUpdateGroup = async (id: string, name: string, projectPath: string) => {
    try {
      const res = await fetch(`/api/groups/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, projectPath }),
      })
      if (!res.ok) throw new Error()
      const group = await res.json()
      setGroups((prev) => prev.map(g => g.id === id ? group : g))
    } catch {
      showError("更新群失败")
    }
  }

  const handleAddMember = async (agentName: string, displayName: string, rolePrompt?: string, model?: string, bubbleColor?: string) => {
    if (!selectedGroupId) return
    try {
      const res = await fetch(`/api/groups/${selectedGroupId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          agentName, 
          displayName,
          rolePrompt,
          model,
          bubbleColor,
        }),
      })
      if (!res.ok) throw new Error()
      const member = await res.json()
      setMembers((prev) => [...prev, member])
    } catch {
      showError("添加成员失败")
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    if (!selectedGroupId) return
    try {
      await fetch(`/api/groups/${selectedGroupId}/members/${memberId}`, { method: "DELETE" })
      setMembers((prev) => prev.filter(m => m.id !== memberId))
    } catch {
      showError("移除成员失败")
    }
  }

  const handleUpdateMember = async (memberId: string, displayName?: string, rolePrompt?: string, model?: string, bubbleColor?: string) => {
    if (!selectedGroupId) return
    try {
      await fetch(`/api/groups/${selectedGroupId}/members/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName, rolePrompt, model, bubbleColor }),
      })
      setMembers((prev) => prev.map(m => 
        m.id === memberId ? { ...m, displayName: displayName || m.displayName, rolePrompt, model, bubbleColor: bubbleColor || m.bubbleColor } : m
      ))
    } catch {
      showError("更新成员失败")
    }
  }

  const workingAgents = Object.entries(agentStatus)
    .filter(([_, status]) => status === "working")
    .map(([id]) => {
      const member = members.find(m => m.id === id)
      return member?.displayName || id
    })

  return (
    <div className="app">
      <main className="main" style={{ marginLeft: 0 }}>
        {selectedGroupId ? (
          <>
            <div style={{ 
              padding: "8px 16px", 
              borderBottom: "1px solid #e5e7eb", 
              background: "#ffffff",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}>
              <span style={{ fontWeight: 600, color: "#111827" }}>
                {selectedGroup?.name || "群聊"}
              </span>
            </div>
            
            <MessageList messages={messages} members={members} />
            
            {workingAgents.length > 0 && (
              <div style={{ 
                padding: "8px 16px", 
                background: "rgba(0,150,255,0.05)", 
                borderTop: "1px solid rgba(0,150,255,0.2)",
                display: "flex",
                alignItems: "center",
                gap: 8
              }}>
                <span style={{ 
                  width: 8, 
                  height: 8, 
                  background: "#0096ff", 
                  borderRadius: "50%",
                  animation: "pulse 1s infinite"
                }} />
                <span style={{ color: "#0096ff", fontSize: 13 }}>
                  {workingAgents.join(", ")} 正在工作中...
                </span>
              </div>
            )}
            
            <MessageInput 
              members={members} 
              onSend={handleSendMessage} 
              mentionTarget={mentionTarget}
              onMentionUsed={() => setMentionTarget(null)}
            />
            <div ref={messagesEndRef} />
          </>
        ) : (
          <div className="empty">选择或创建一个群开始聊天</div>
        )}
      </main>
      
      <RightPanel
        groups={groups}
        selectedGroupId={selectedGroupId}
        onSelectGroup={setSelectedGroupId}
        onCreateGroup={() => setShowCreateModal(true)}
        onDeleteGroup={handleDeleteGroup}
        onUpdateGroup={handleUpdateGroup}
        onClearMessages={handleClearMessages}
        members={members}
        agents={agents}
        models={models}
        agentStatus={agentStatus}
        onAddMember={handleAddMember}
        onRemoveMember={handleRemoveMember}
        onUpdateMember={handleUpdateMember}
        onMentionMember={(name) => setMentionTarget(name)}
      />
      
      {showCreateModal && (
        <CreateGroupModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateGroup}
        />
      )}
    </div>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </ErrorBoundary>
  )
}
