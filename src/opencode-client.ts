import { createOpencode } from "@opencode-ai/sdk"

type OpenCodeInstance = {
  client: Awaited<ReturnType<typeof createOpencode>>["client"]
  server: {
    url: string
    close: () => void
  }
}

let instance: OpenCodeInstance | null = null
let initPromise: Promise<OpenCodeInstance> | null = null
let initError: Error | null = null

export async function getOpenCodeClient(): Promise<OpenCodeInstance["client"]> {
  if (instance) {
    return instance.client
  }
  
  if (initError) {
    initError = null
  }
  
  if (initPromise) {
    try {
      const result = await initPromise
      return result.client
    } catch (e) {
      initPromise = null
      throw e
    }
  }
  
  initPromise = initOpenCode()
  try {
    instance = await initPromise
    return instance.client
  } catch (e) {
    initPromise = null
    initError = e instanceof Error ? e : new Error(String(e))
    throw initError
  }
}

async function initOpenCode(): Promise<OpenCodeInstance> {
  console.log("Starting OpenCode server...")
  
  const abortController = new AbortController()
  
  const { client, server } = await createOpencode({
    signal: abortController.signal,
    port: 0,
    hostname: "127.0.0.1",
  })
  
  console.log(`OpenCode server started at ${server.url}`)
  
  return { client, server }
}

export function closeOpenCode(): void {
  if (instance) {
    instance.server.close()
    instance = null
    initPromise = null
  }
}
