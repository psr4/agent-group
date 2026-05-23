export type MemberStatus = "idle" | "working" | "error"
export type SenderType = "user" | "agent"
export type MessageStatus = "completed" | "interrupted" | "error"

export const MEMBER_STATUSES: MemberStatus[] = ["idle", "working", "error"]
export const SENDER_TYPES: SenderType[] = ["user", "agent"]
export const MESSAGE_STATUSES: MessageStatus[] = ["completed", "interrupted", "error"]

export function isMemberStatus(value: string): value is MemberStatus {
  return MEMBER_STATUSES.includes(value as MemberStatus)
}

export function isSenderType(value: string): value is SenderType {
  return SENDER_TYPES.includes(value as SenderType)
}

export function isMessageStatus(value: string): value is MessageStatus {
  return MESSAGE_STATUSES.includes(value as MessageStatus)
}

export function toMemberStatus(value: string): MemberStatus {
  return isMemberStatus(value) ? value : "idle"
}

export function toSenderType(value: string): SenderType {
  return isSenderType(value) ? value : "user"
}

export function toMessageStatus(value: string): MessageStatus {
  return isMessageStatus(value) ? value : "completed"
}
