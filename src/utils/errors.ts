import type { Context } from "hono"
import { ValidationError } from "./validation.js"

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message)
    this.name = "ApiError"
  }
}

export class NotFoundError extends ApiError {
  constructor(message: string = "Resource not found") {
    super(message, 404, "NOT_FOUND")
  }
}

export class BadRequestError extends ApiError {
  constructor(message: string = "Bad request") {
    super(message, 400, "BAD_REQUEST")
  }
}

export class InternalError extends ApiError {
  constructor(message: string = "Internal server error") {
    super(message, 500, "INTERNAL_ERROR")
  }
}

export function errorHandler(err: Error, c: Context): Response {
  if (err instanceof ValidationError) {
    return c.json({ error: err.message, code: "VALIDATION_ERROR" }, 400)
  }
  
  if (err instanceof ApiError) {
    return c.json({ error: err.message, code: err.code }, err.statusCode as 400 | 404 | 500)
  }
  
  console.error("Unhandled error:", err)
  return c.json({ error: "Internal server error", code: "INTERNAL_ERROR" }, 500)
}