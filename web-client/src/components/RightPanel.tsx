import { useState } from "react"
import type { Group, GroupMember, Agent, Model } from "../types"

type Props = {
  groups: Group[]
  selectedGroupId: string | null
  onSelectGroup: (id: string) => void
  onCreateGroup: () => void
  onDeleteGroup: (id: string) => void
  onUpdateGroup: (id: string, name: string, projectPath: string) => void
  members: GroupMember[]
  agents: Agent[]
  models: Model[]
  agentStatus: Record<string, "idle" | "working" | "error">
  onAddMember: (agentName: string, displayName: string, rolePrompt?: string, model?: string, bubbleColor?: string) => void
  onRemoveMember: (memberId: string) => void
  onUpdateMember: (memberId: string, displayName?: string, rolePrompt?: string, model?: string, bubbleColor?: string) => void
  onMentionMember: (name: string) => void
}

export default function RightPanel({
  groups,
  selectedGroupId,
  onSelectGroup,
  onCreateGroup,
  onDeleteGroup,
  onUpdateGroup,
  members,
  agents,
  models,
  agentStatus,
  onAddMember,
  onRemoveMember,
  onUpdateMember,
  onMentionMember,
}: Props) {
  const [showAdd, setShowAdd] = useState(false)
  const [selectedAgent, setSelectedAgent] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [rolePrompt, setRolePrompt] = useState("")
  const [selectedModel, setSelectedModel] = useState("")
  const [bubbleColor, setBubbleColor] = useState("#0096ff")
  
  const [editingMember, setEditingMember] = useState<string | null>(null)
  const [editDisplayName, setEditDisplayName] = useState("")
  const [editRolePrompt, setEditRolePrompt] = useState("")
  const [editModel, setEditModel] = useState("")
  const [editBubbleColor, setEditBubbleColor] = useState("#0096ff")
  
  const [editingGroup, setEditingGroup] = useState<string | null>(null)
  const [editGroupName, setEditGroupName] = useState("")
  const [editGroupPath, setEditGroupPath] = useState("")
  
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; member: GroupMember } | null>(null)
  
  const handleAdd = () => {
    if (selectedAgent && displayName.trim()) {
      onAddMember(selectedAgent, displayName.trim(), rolePrompt || undefined, selectedModel || undefined, bubbleColor)
      setSelectedAgent("")
      setDisplayName("")
      setRolePrompt("")
      setSelectedModel("")
      setBubbleColor("#0096ff")
      setShowAdd(false)
    }
  }
  
  const startEdit = (member: GroupMember) => {
    setEditingMember(member.id)
    setEditDisplayName(member.displayName)
    setEditRolePrompt(member.rolePrompt || "")
    setEditModel(member.model || "")
    setEditBubbleColor(member.bubbleColor || "#0096ff")
  }
  
  const cancelEdit = () => {
    setEditingMember(null)
  }
  
  const saveEdit = (memberId: string) => {
    onUpdateMember(memberId, editDisplayName, editRolePrompt || undefined, editModel || undefined, editBubbleColor)
    setEditingMember(null)
  }
  
  const handleContextMenu = (e: React.MouseEvent, member: GroupMember) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY, member })
  }
  
  const handleMentionClick = () => {
    if (contextMenu) {
      onMentionMember(contextMenu.member.displayName)
      setContextMenu(null)
    }
  }
  
  const startEditGroup = (group: Group) => {
    setEditingGroup(group.id)
    setEditGroupName(group.name)
    setEditGroupPath(group.projectPath)
  }
  
  const cancelEditGroup = () => {
    setEditingGroup(null)
  }
  
  const saveEditGroup = (id: string) => {
    if (editGroupName.trim() && editGroupPath.trim()) {
      onUpdateGroup(id, editGroupName.trim(), editGroupPath.trim())
      setEditingGroup(null)
    }
  }
  
  return (
    <aside style={{ 
      width: 280, 
      background: "#f8f9fa", 
      borderLeft: "1px solid #e5e7eb",
      display: "flex",
      flexDirection: "column",
      height: "100vh"
    }}>
      {/* 群列表 */}
      <div style={{ padding: 12, borderBottom: "1px solid #e5e7eb" }}>
        <div style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center",
          marginBottom: 8 
        }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: "#374151" }}>群列表</span>
          <button 
            onClick={onCreateGroup}
            style={{ 
              padding: "4px 8px", 
              background: "#0096ff", 
              border: "none", 
              borderRadius: 4, 
              cursor: "pointer",
              fontSize: 12,
              color: "#fff"
            }}
          >
            + 新建
          </button>
        </div>
        
        {groups.map((group) => {
          const isEditing = editingGroup === group.id
          
          if (isEditing) {
            return (
              <div
                key={group.id}
                style={{
                  padding: 8,
                  borderRadius: 4,
                  marginBottom: 4,
                  background: "#fff",
                  border: "1px solid #0096ff"
                }}
              >
                <input
                  type="text"
                  value={editGroupName}
                  onChange={(e) => setEditGroupName(e.target.value)}
                  placeholder="群名称"
                  style={{ width: "100%", padding: 6, marginBottom: 4, borderRadius: 4, border: "1px solid #e5e7eb", fontSize: 12 }}
                />
                <input
                  type="text"
                  value={editGroupPath}
                  onChange={(e) => setEditGroupPath(e.target.value)}
                  placeholder="项目路径"
                  style={{ width: "100%", padding: 6, marginBottom: 4, borderRadius: 4, border: "1px solid #e5e7eb", fontSize: 12 }}
                />
                <div style={{ display: "flex", gap: 4 }}>
                  <button onClick={() => saveEditGroup(group.id)} style={{ flex: 1, padding: 4, background: "#0096ff", border: "none", borderRadius: 4, cursor: "pointer", color: "#fff", fontSize: 11 }}>保存</button>
                  <button onClick={cancelEditGroup} style={{ flex: 1, padding: 4, background: "#f3f4f6", border: "none", borderRadius: 4, cursor: "pointer", color: "#374151", fontSize: 11 }}>取消</button>
                </div>
              </div>
            )
          }
          
          return (
            <div
              key={group.id}
              style={{
                padding: 8,
                borderRadius: 4,
                marginBottom: 4,
                background: selectedGroupId === group.id ? "rgba(0,150,255,0.08)" : "transparent",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div
                onClick={() => onSelectGroup(group.id)}
                style={{ cursor: "pointer", flex: 1, color: selectedGroupId === group.id ? "#0096ff" : "#374151" }}
              >
                {group.name}
              </div>
              <div style={{ display: "flex", gap: 4 }}>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    startEditGroup(group)
                  }}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#9ca3af",
                    cursor: "pointer",
                    padding: "2px 6px",
                    fontSize: 11,
                  }}
                >
                  编辑
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    if (confirm(`确定删除群 "${group.name}"?`)) {
                      onDeleteGroup(group.id)
                    }
                  }}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#d1d5db",
                    cursor: "pointer",
                    padding: "2px 6px",
                    fontSize: 12,
                  }}
                >
                  ✕
                </button>
              </div>
            </div>
          )
        })}
      </div>
      
      {/* 群成员 */}
      <div style={{ padding: 12, flex: 1, overflow: "auto" }}>
        <div style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center",
          marginBottom: 8 
        }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: "#374151" }}>群成员</span>
          {selectedGroupId && (
            <button 
              onClick={() => setShowAdd(!showAdd)}
              style={{ 
                padding: "4px 8px", 
                background: "#0096ff", 
                border: "none", 
                borderRadius: 4, 
                cursor: "pointer",
                fontSize: 12,
                color: "#fff"
              }}
            >
              + 添加
            </button>
          )}
        </div>
        
        {showAdd && (
          <div style={{ 
            padding: 12, 
            background: "#fff", 
            borderRadius: 6, 
            marginBottom: 12,
            border: "1px solid #e5e7eb"
          }}>
            <select 
              value={selectedAgent}
              onChange={(e) => setSelectedAgent(e.target.value)}
              style={{ width: "100%", padding: 8, marginBottom: 8, borderRadius: 4, border: "1px solid #e5e7eb" }}
            >
              <option value="">选择 Agent</option>
              {agents.map(a => (
                <option key={a.name} value={a.name}>{a.name}</option>
              ))}
            </select>
            
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="成员名称"
              style={{ width: "100%", padding: 8, marginBottom: 8, borderRadius: 4, border: "1px solid #e5e7eb" }}
            />
            
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <input
                type="color"
                value={bubbleColor}
                onChange={(e) => setBubbleColor(e.target.value)}
                style={{ width: 40, height: 32, border: "none", cursor: "pointer" }}
              />
              <span style={{ fontSize: 12, color: "#6b7280" }}>气泡颜色</span>
            </div>
            
            <select 
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              style={{ width: "100%", padding: 8, marginBottom: 8, borderRadius: 4, border: "1px solid #e5e7eb" }}
            >
              <option value="">默认模型</option>
              {models.map(m => (
                <option key={m.id} value={m.id}>[{m.provider}] {m.name}</option>
              ))}
            </select>
            
            <textarea
              value={rolePrompt}
              onChange={(e) => setRolePrompt(e.target.value)}
              placeholder="角色描述（可选）"
              style={{ width: "100%", padding: 8, marginBottom: 8, borderRadius: 4, border: "1px solid #e5e7eb", minHeight: 50, fontSize: 13, resize: "vertical" }}
            />
            
            <button 
              onClick={handleAdd}
              disabled={!selectedAgent || !displayName.trim()}
              style={{ 
                width: "100%",
                padding: 8, 
                background: selectedAgent && displayName.trim() ? "#0096ff" : "#d1d5db", 
                border: "none", 
                borderRadius: 4, 
                cursor: selectedAgent && displayName.trim() ? "pointer" : "not-allowed",
                color: "#fff"
              }}
            >
              添加成员
            </button>
          </div>
        )}
        
        {members.map((member) => {
          const status = agentStatus[member.id] || member.status
          const isEditing = editingMember === member.id
          
          if (isEditing) {
            return (
              <div key={member.id} style={{ padding: 8, background: "#fff", borderRadius: 4, marginBottom: 4, border: "1px solid #0096ff" }}>
                <input
                  type="text"
                  value={editDisplayName}
                  onChange={(e) => setEditDisplayName(e.target.value)}
                  placeholder="成员名称"
                  style={{ width: "100%", padding: 6, marginBottom: 8, borderRadius: 4, border: "1px solid #e5e7eb", fontSize: 12 }}
                />
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <input
                    type="color"
                    value={editBubbleColor}
                    onChange={(e) => setEditBubbleColor(e.target.value)}
                    style={{ width: 40, height: 28, border: "none", cursor: "pointer" }}
                  />
                  <span style={{ fontSize: 11, color: "#6b7280" }}>气泡颜色</span>
                </div>
                <select 
                  value={editModel}
                  onChange={(e) => setEditModel(e.target.value)}
                  style={{ width: "100%", padding: 6, marginBottom: 8, borderRadius: 4, border: "1px solid #e5e7eb", fontSize: 12 }}
                >
                  <option value="">默认模型</option>
                  {models.map(m => (
                    <option key={m.id} value={m.id}>[{m.provider}] {m.name}</option>
                  ))}
                </select>
                <textarea
                  value={editRolePrompt}
                  onChange={(e) => setEditRolePrompt(e.target.value)}
                  placeholder="角色描述"
                  style={{ width: "100%", padding: 6, marginBottom: 8, borderRadius: 4, border: "1px solid #e5e7eb", minHeight: 40, fontSize: 12, resize: "vertical" }}
                />
                <div style={{ display: "flex", gap: 4 }}>
                  <button onClick={() => saveEdit(member.id)} style={{ flex: 1, padding: 6, background: "#0096ff", border: "none", borderRadius: 4, cursor: "pointer", color: "#fff", fontSize: 12 }}>保存</button>
                  <button onClick={cancelEdit} style={{ flex: 1, padding: 6, background: "#f3f4f6", border: "none", borderRadius: 4, cursor: "pointer", color: "#374151", fontSize: 12 }}>取消</button>
                </div>
              </div>
            )
          }
          
          return (
            <div 
              key={member.id}
              onContextMenu={(e) => handleContextMenu(e, member)}
              style={{ 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "space-between",
                padding: "6px 8px",
                background: "#fff",
                borderRadius: 4,
                marginBottom: 4,
                cursor: "context-menu"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
                <span style={{ 
                  width: 8, 
                  height: 8, 
                  borderRadius: "50%", 
                  background: status === "working" ? "#0096ff" : status === "error" ? "#ef4444" : "#10b981",
                  flexShrink: 0
                }} />
                <span style={{ color: member.bubbleColor || "#374151", fontWeight: 500 }}>{member.displayName}</span>
                {member.model && (
                  <span style={{ fontSize: 10, color: "#9ca3af" }}>
                    {member.model.split("/").pop()}
                  </span>
                )}
              </div>
              <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                <button onClick={() => startEdit(member)} style={{ background: "transparent", border: "none", color: "#9ca3af", cursor: "pointer", padding: "2px 6px", fontSize: 11 }}>编辑</button>
                <button onClick={() => onRemoveMember(member.id)} style={{ background: "transparent", border: "none", color: "#d1d5db", cursor: "pointer", padding: "2px 6px", fontSize: 11 }}>删除</button>
              </div>
            </div>
          )
        })}
        
        {members.length === 0 && !showAdd && selectedGroupId && (
          <div style={{ color: "#9ca3af", fontSize: 13, textAlign: "center", padding: 8 }}>
            还没有成员
          </div>
        )}
      </div>
      
      {/* 右键菜单 */}
      {contextMenu && (
        <>
          <div 
            style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 999 }}
            onClick={() => setContextMenu(null)}
          />
          <ContextMenuPortal x={contextMenu.x} y={contextMenu.y} displayName={contextMenu.member.displayName} onClick={handleMentionClick} />
        </>
      )}
    </aside>
  )
}

function ContextMenuPortal({ x, y, displayName, onClick }: { x: number; y: number; displayName: string; onClick: () => void }) {
  const menuWidth = 120
  const menuHeight = 40
  const padding = 8
  
  const adjustedX = Math.min(x, window.innerWidth - menuWidth - padding)
  const adjustedY = Math.min(y, window.innerHeight - menuHeight - padding)
  
  return (
    <div style={{
      position: "fixed",
      left: Math.max(padding, adjustedX),
      top: Math.max(padding, adjustedY),
      background: "#fff",
      border: "1px solid #e5e7eb",
      borderRadius: 4,
      boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
      zIndex: 1000,
      minWidth: 100,
    }}>
      <div
        onClick={onClick}
        style={{
          padding: "8px 12px",
          cursor: "pointer",
          fontSize: 13,
          color: "#374151",
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = "#f3f4f6"}
        onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
      >
        @{displayName}
      </div>
    </div>
  )
}
