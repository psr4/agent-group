import { useState, useRef, useEffect, useCallback } from "react"
import type { GroupMember } from "../types"

type Props = {
  members: GroupMember[]
  onSend: (content: string, mentions: string[]) => void
  mentionTarget?: string | null
  onMentionUsed?: () => void
}

export default function MessageInput({ members, onSend, mentionTarget, onMentionUsed }: Props) {
  const [input, setInput] = useState("")
  const [showMentions, setShowMentions] = useState(false)
  const [mentionFilter, setMentionFilter] = useState("")
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isComposing, setIsComposing] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const justFinishedCompose = useRef(false)
  const onMentionUsedRef = useRef(onMentionUsed)
  onMentionUsedRef.current = onMentionUsed

  useEffect(() => {
    if (mentionTarget) {
      setInput(prev => prev + `@${mentionTarget} `)
      onMentionUsedRef.current?.()
      inputRef.current?.focus()
    }
  }, [mentionTarget])

  const mentionOptions = [
    { name: "所有人", color: "#ef4444" },
    ...members.map(m => ({ name: m.displayName, color: "#0096ff" }))
  ]

  const filteredOptions = mentionOptions.filter((a) =>
    a.name.toLowerCase().includes(mentionFilter.toLowerCase())
  )

  const handleSend = () => {
    if (!input.trim()) return
    const mentions: string[] = []
    
    // 检查 @所有人
    if (input.includes("@所有人") || input.includes("@all")) {
      mentions.push("所有人")
    }
    
    // 检查每个成员的 @displayName
    for (const m of members) {
      if (input.includes(`@${m.displayName}`)) {
        mentions.push(m.displayName)
      }
    }
    
    onSend(input, mentions)
    setInput("")
    setShowMentions(false)
    setMentionFilter("")
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setInput(value)

    const lastAtIndex = value.lastIndexOf("@")
    if (lastAtIndex !== -1) {
      const afterAt = value.slice(lastAtIndex + 1)
      if (!afterAt.includes(" ")) {
        setMentionFilter(afterAt)
        setShowMentions(true)
        setSelectedIndex(0)
        return
      }
    }
    setShowMentions(false)
    setMentionFilter("")
  }

  const handleSelectMention = (option: { name: string; color: string }) => {
    const lastAtIndex = input.lastIndexOf("@")
    if (lastAtIndex !== -1) {
      const beforeAt = input.slice(0, lastAtIndex)
      const newInput = beforeAt + `@${option.name} `
      setInput(newInput)
      setShowMentions(false)
      setMentionFilter("")
      inputRef.current?.focus()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (isComposing) {
      return
    }

    if (justFinishedCompose.current && (e.key === "Enter" || e.key === " ")) {
      justFinishedCompose.current = false
      if (e.key === "Enter") {
        return
      }
    }

    if (showMentions && filteredOptions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault()
        setSelectedIndex((i) => (i + 1) % filteredOptions.length)
        return
      }
      if (e.key === "ArrowUp") {
        e.preventDefault()
        setSelectedIndex((i) => (i - 1 + filteredOptions.length) % filteredOptions.length)
        return
      }
      if (e.key === "Tab" || e.key === "Enter") {
        e.preventDefault()
        handleSelectMention(filteredOptions[selectedIndex])
        return
      }
      if (e.key === "Escape") {
        setShowMentions(false)
        setMentionFilter("")
        return
      }
    }

    if (e.key === "Enter" && !isComposing) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleCompositionEnd = () => {
    setIsComposing(false)
    justFinishedCompose.current = true
    setTimeout(() => {
      justFinishedCompose.current = false
    }, 300)
  }

  return (
    <div style={{ padding: "12px 16px", borderTop: "1px solid #e5e7eb", background: "#ffffff", display: "flex", gap: 8, position: "relative" }}>
      <input
        ref={inputRef}
        type="text"
        value={input}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onCompositionStart={() => setIsComposing(true)}
        onCompositionEnd={handleCompositionEnd}
        placeholder="输入消息... @ 提及成员"
        style={{ flex: 1, padding: "8px 12px", background: "#f8f9fa", border: "1px solid #e5e7eb", borderRadius: 6, fontSize: 14, outline: "none" }}
      />
      <button onClick={handleSend} style={{ padding: "8px 16px", background: "#0096ff", border: "none", color: "#ffffff", borderRadius: 6, cursor: "pointer", fontWeight: 500 }}>
        发送
      </button>
      
      {showMentions && filteredOptions.length > 0 && (
        <div style={{
          position: "absolute",
          bottom: "100%",
          left: 16,
          right: 16,
          background: "#ffffff",
          border: "1px solid #e5e7eb",
          borderRadius: 6,
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          maxHeight: 200,
          overflow: "auto",
          marginBottom: 8,
        }}>
          {filteredOptions.map((option, index) => (
            <div
              key={option.name}
              onClick={() => handleSelectMention(option)}
              style={{
                padding: "8px 12px",
                cursor: "pointer",
                background: index === selectedIndex ? "rgba(0,150,255,0.1)" : "transparent",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span style={{ color: option.color }}>●</span>
              <span style={{ color: "#374151" }}>{option.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
