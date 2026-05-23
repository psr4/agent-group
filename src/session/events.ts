export interface GlobalEvent {
  payload?: {
    type?: string
    properties?: {
      sessionID?: string
      part?: {
        sessionID?: string
        type?: string
        text?: string
      }
      delta?: string
      error?: string
    }
  }
}

export function isGlobalEvent(event: unknown): event is GlobalEvent {
  return typeof event === "object" && event !== null
}

export function isSessionIdleEvent(event: GlobalEvent, sessionId: string): boolean {
  return event.payload?.type === "session.idle" &&
    event.payload.properties?.sessionID === sessionId
}

export function isMessagePartUpdatedEvent(event: GlobalEvent, sessionId: string): boolean {
  const props = event.payload?.properties
  return event.payload?.type === "message.part.updated" &&
    props?.part?.sessionID === sessionId &&
    props?.part?.type === "text" &&
    typeof props?.part?.text === "string"
}

export function isSessionErrorEvent(event: GlobalEvent, sessionId: string): boolean {
  return event.payload?.type === "session.error" &&
    event.payload?.properties?.sessionID === sessionId
}

export function getSessionError(event: GlobalEvent): string | undefined {
  return event.payload?.properties?.error
}

export function getMessageText(event: GlobalEvent): string | undefined {
  return event.payload?.properties?.part?.text
}
