import { Hono } from "hono"
import { serve } from "@hono/node-server"
import { serveStatic } from "@hono/node-server/serve-static"
import { join, dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { existsSync } from "node:fs"
import type { Server as HttpServer } from "node:http"
import api from "./api/index.js"
import { initDb, closeDb } from "./db/index.js"
import { setupWebSocket } from "./ws/index.js"
import { closeOpenCode } from "./opencode-client.js"

const __dirname = dirname(fileURLToPath(import.meta.url))

export type ServerOptions = {
  port: number
  directory: string
}

export function createServer(options: ServerOptions) {
  initDb()
  
  const app = new Hono()
  
  app.route("/api", api)
  
  app.get("/health", (c) => c.json({ status: "ok" }))
  
  const distPath = resolve(__dirname, "..", "web-client", "dist")
  const publicPath = resolve(__dirname, "..", "public")
  
  if (existsSync(distPath)) {
    app.use("/assets/*", serveStatic({ root: distPath }))
    app.use("/*", serveStatic({ root: distPath }))
  }
  
  if (existsSync(publicPath)) {
    app.use("/public/*", serveStatic({ root: publicPath }))
  }
  
  app.get("*", (c) => {
    return c.html(`<!DOCTYPE html>
<html lang="zh">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>OpenCode Web</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>`)
  })
  
  return app
}

export function startServer(options: ServerOptions): void {
  const app = createServer(options)
  
  const server = serve(
    {
      fetch: app.fetch,
      port: options.port,
    },
    (info) => {
      console.log(`OpenCode Web started at http://localhost:${info.port}`)
      console.log(`Project directory: ${options.directory}`)
    }
  ) as HttpServer
  
  setupWebSocket(server)
  
  const shutdown = () => {
    console.log("\nShutting down...")
    closeDb()
    closeOpenCode()
    server.close()
    process.exit(0)
  }
  
  process.on("SIGINT", shutdown)
  process.on("SIGTERM", shutdown)
}
