import { useEffect, useRef, useCallback } from "react"
import type { WsMessage } from "../types"

export function useWebSocket(groupId: string | null, onMessage: (msg: WsMessage) => void) {
  const wsRef = useRef<WebSocket | null>(null)
  const onMessageRef = useRef(onMessage)
  const reconnectTimeoutRef = useRef<number | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const mountedRef = useRef(true)
  
  onMessageRef.current = onMessage

  const connect = useCallback(() => {
    if (!groupId || !mountedRef.current) return
    
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:"
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws/${groupId}`)
    wsRef.current = ws
    
    ws.onopen = () => {
      reconnectAttemptsRef.current = 0
    }
    
    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as WsMessage
        onMessageRef.current(msg)
      } catch {
        console.error("Failed to parse WebSocket message")
      }
    }
    
    ws.onclose = () => {
      if (!mountedRef.current) return
      const maxAttempts = 5
      const baseDelay = 1000
      const maxDelay = 30000
      
      if (reconnectAttemptsRef.current < maxAttempts) {
        const delay = Math.min(baseDelay * Math.pow(2, reconnectAttemptsRef.current), maxDelay)
        reconnectAttemptsRef.current++
        reconnectTimeoutRef.current = window.setTimeout(connect, delay)
      }
    }
    
    ws.onerror = () => {
      ws.close()
    }
  }, [groupId])

  useEffect(() => {
    mountedRef.current = true
    connect()
    
    return () => {
      mountedRef.current = false
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      wsRef.current?.close()
    }
  }, [connect])

  const sendMessage = (msg: WsMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg))
    }
  }
  return { sendMessage }
}
