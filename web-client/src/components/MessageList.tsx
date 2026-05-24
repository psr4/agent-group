import type { Message, GroupMember } from "../types"

type Props = {
  messages: Message[]
  members: GroupMember[]
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

function formatReplayTags(content: string): string {
  // 匹配所有 <replay> 标签，支持任意属性顺序
  // 格式: <replay ...>content</replay>
  let result = content.replace(/<replay\s+([^>]*)>([\s\S]*?)<\/replay>/g, (fullMatch, attrs, replayContent) => {
    // 解析属性
    const toMatch = attrs.match(/to="([^"]+)"/)
    const isMaster = attrs.includes('master="true"')
    const targetNames = toMatch ? toMatch[1] : ''
    
    if (isMaster && targetNames) {
      return `@你 和 @${targetNames} :\n${replayContent.trim()}`
    } else if (isMaster) {
      return `@你 :\n${replayContent.trim()}`
    } else if (targetNames) {
      return `@${targetNames} :\n${replayContent.trim()}`
    }
    return fullMatch
  })
  
  // 最后转义 HTML
  result = escapeHtml(result)
  
  return result
}

export default function MessageList({ messages, members }: Props) {
  const getBubbleColor = (senderName: string): string => {
    const member = members.find(m => m.displayName === senderName)
    return member?.bubbleColor || '#0096ff'
  }
  
  return (
    <div style={{ flex: 1, padding: 16, overflow: "auto", background: "#f5f5f5" }}>
      {messages.map((msg) => {
        const isUser = msg.senderType === "user"
        const bubbleColor = isUser ? '#10b981' : getBubbleColor(msg.senderName)
        
        return (
          <div 
            key={msg.id} 
            style={{ 
              marginBottom: 12, 
              display: "flex", 
              flexDirection: "column",
              alignItems: isUser ? "flex-end" : "flex-start"
            }}
          >
            <div style={{ 
              display: "flex", 
              alignItems: "center", 
              marginBottom: 4,
              flexDirection: isUser ? "row-reverse" : "row"
            }}>
              <span 
                style={{ 
                  background: bubbleColor, 
                  color: "#fff",
                  padding: "2px 8px",
                  borderRadius: 12,
                  fontSize: 12,
                  fontWeight: 500,
                  marginLeft: isUser ? 0 : 4,
                  marginRight: isUser ? 4 : 0,
                }}
              >
                {isUser ? "你" : msg.senderName}
              </span>
              <span style={{ color: "#9ca3af", fontSize: 10 }}>
                {new Date(msg.createdAt).toLocaleTimeString()}
              </span>
            </div>
            <div 
              style={{ 
                background: isUser ? "#fff" : bubbleColor + "15",
                borderLeft: isUser ? "none" : `3px solid ${bubbleColor}`,
                borderRight: isUser ? `3px solid ${bubbleColor}` : "none",
                color: "#374151", 
                lineHeight: 1.6, 
                whiteSpace: "pre-wrap",
                padding: "8px 12px",
                borderRadius: 8,
                maxWidth: "80%",
                boxShadow: "0 1px 2px rgba(0,0,0,0.1)"
              }}
            >
              {formatReplayTags(msg.content)}
            </div>
          </div>
        )
      })}
    </div>
  )
}
