export type ProviderResponse = {
  all?: Array<{
    id: string
    name: string
    env: string[]
    key?: string
    models?: Record<string, {
      id: string
      name: string
    }>
  }>
}

export type OpenCodeAgent = {
  name: string
  description?: string
  mode: string
  builtIn: boolean
  color?: string
}

export function isProviderResponse(data: unknown): data is ProviderResponse {
  return typeof data === "object" && data !== null
}

export function isOpenCodeAgentArray(data: unknown): data is OpenCodeAgent[] {
  return Array.isArray(data)
}
