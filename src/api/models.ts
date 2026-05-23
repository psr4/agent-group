import { Hono } from "hono"
import { getOpenCodeClient } from "../opencode-client.js"
import type { ProviderResponse } from "../types/api.js"
import { isProviderResponse } from "../types/api.js"

const app = new Hono()

type Model = {
  id: string
  name: string
  provider: string
}

app.get("/", async (c) => {
  try {
    const directory = c.req.query("directory") || process.cwd()
    
    const client = await getOpenCodeClient()
    
    const result = await client.provider.list({
      query: { directory },
    })
    
    if (result.error || !result.data) {
      console.error("Failed to fetch providers:", result.error)
      return c.json([])
    }
    
    const models: Model[] = []
    const response: ProviderResponse = isProviderResponse(result.data) ? result.data : {}
    const providers = response?.all || []
    
    for (const provider of providers) {
      const isConfigured = provider.key || 
        (provider.env.length > 0 && provider.env.every(envVar => process.env[envVar]))
      
      if (!isConfigured) continue
      
      if (provider.models) {
        for (const [modelId, model] of Object.entries(provider.models)) {
          models.push({
            id: `${provider.id}/${modelId}`,
            name: model.name,
            provider: provider.name || provider.id,
          })
        }
      }
    }
    
    return c.json(models)
  } catch (error) {
    console.error("Error fetching models:", error)
    return c.json([])
  }
})

export default app
