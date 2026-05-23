import { resolve, normalize } from "node:path"

export class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ValidationError"
  }
}

export function validateRequired(value: unknown, fieldName: string): void {
  if (value === undefined || value === null || value === "") {
    throw new ValidationError(`${fieldName} is required`)
  }
}

export function validateString(value: unknown, fieldName: string, maxLength?: number): string {
  validateRequired(value, fieldName)
  if (typeof value !== "string") {
    throw new ValidationError(`${fieldName} must be a string`)
  }
  if (maxLength && value.length > maxLength) {
    throw new ValidationError(`${fieldName} must be at most ${maxLength} characters`)
  }
  return value
}

export function validateArray(value: unknown, fieldName: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new ValidationError(`${fieldName} must be an array`)
  }
  return value
}

export function validateOneOf<T extends string>(value: string, options: T[], fieldName: string): T {
  if (!options.includes(value as T)) {
    throw new ValidationError(`${fieldName} must be one of: ${options.join(", ")}`)
  }
  return value as T
}

export function validatePath(path: string, fieldName: string): string {
  const normalized = normalize(path)
  if (normalized.includes("..") || path.includes("..")) {
    throw new ValidationError(`${fieldName} contains invalid path traversal`)
  }
  if (path.startsWith("/") || /^[A-Za-z]:/.test(path)) {
    throw new ValidationError(`${fieldName} must be a relative path, not absolute`)
  }
  return normalized
}

export function validateProjectPath(path: string): string {
  validateRequired(path, "projectPath")
  const str = validateString(path, "projectPath", 4096)
  try {
    return validatePath(str, "projectPath")
  } catch {
    return str
  }
}
