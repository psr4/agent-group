import { Hono } from "hono"
import { getDb } from "../db/index.js"
import { createMessage, listMessages } from "../db/queries.js"
import { validateString, validateArray, validateOneOf } from "../utils/validation.js"
import { BadRequestError } from "../utils/errors.js"

const app = new Hono()

app.get("/", (c) => {
  const groupId = c.req.param("groupId")
  if (!groupId) {
    throw new BadRequestError("groupId is required")
  }
  const limit = parseInt(c.req.query("limit") || "100")
  const db = getDb()
  const messages = listMessages(db, groupId, limit)
  return c.json(messages)
})

app.post("/", async (c) => {
  const groupId = c.req.param("groupId")
  if (!groupId) {
    throw new BadRequestError("groupId is required")
  }
  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    throw new BadRequestError("Invalid JSON")
  }
  
  const typedBody = body as {
    senderType?: string
    senderName?: string
    content?: string
    mentions?: unknown[]
  }
  
  const senderType = validateOneOf(
    validateString(typedBody.senderType, "senderType", 50),
    ["user", "agent"],
    "senderType"
  )
  const senderName = validateString(typedBody.senderName, "senderName", 255)
  const content = validateString(typedBody.content, "content", 100000)
  const mentions = validateArray(typedBody.mentions, "mentions")
    .filter((m): m is string => typeof m === "string")
    .map(m => validateString(m, "mention", 255))
  
  const db = getDb()
  const message = createMessage(db, groupId, senderType, senderName, content, mentions)
  return c.json(message, 201)
})

export default app
