import { Hono } from "hono"
import { WebSocketServer, WebSocket } from "ws"
import type { Server as HttpServer } from "node:http"
import { handleOpen, handleClose, handleMessage } from "./handler.js"

const app = new Hono()

let wss: WebSocketServer | null = null

export function setupWebSocket(server: HttpServer): void {
  wss = new WebSocketServer({ server })
  
  wss.on("connection", (ws, req) => {
    const url = req.url || ""
    const match = url.match(/\/ws\/(.+)$/)
    if (!match) {
      ws.close()
      return
    }
    
    const groupId = match[1]
    handleOpen(ws, groupId)
    
    ws.on("close", () => handleClose(ws, groupId))
    ws.on("message", (data) => {
      handleMessage(ws, data.toString(), groupId)
    })
  })
}

app.get("/:groupId", (c) => {
  return c.json({ message: "WebSocket endpoint - connect via ws://" })
})

export default app
