import { Hono } from "hono"
import type { Agent } from "../types.js"
import { getOpenCodeClient } from "../opencode-client.js"
import type { OpenCodeAgent } from "../types/api.js"
import { isOpenCodeAgentArray } from "../types/api.js"

const app = new Hono()

const DEFAULT_COLORS = [
  "#0096ff",
  "#7c3aed",
  "#f59e0b",
  "#10b981",
  "#ef4444",
  "#ec4899",
  "#8b5cf6",
  "#06b6d4",
]

app.get("/", async (c) => {
  try {
    const directory = c.req.query("directory") || process.cwd()
    
    const client = await getOpenCodeClient()
    
    const result = await client.app.agents({
      query: { directory },
    })
    
    if (result.error) {
      console.error("Failed to fetch agents:", result.error)
      return c.json([])
    }
    
    const agentsData: OpenCodeAgent[] = isOpenCodeAgentArray(result.data) ? result.data : []
    const agents: Agent[] = agentsData.map((agent, index) => ({
      name: agent.name,
      description: agent.description || "",
      color: agent.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length],
    }))
    
    return c.json(agents)
  } catch (error) {
    console.error("Error fetching agents:", error)
    return c.json([])
  }
})

export default app
