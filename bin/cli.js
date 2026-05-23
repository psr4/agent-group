#!/usr/bin/env node
import { fileURLToPath } from "url"
import { dirname, join } from "path"
import { spawn } from "child_process"

const __dirname = dirname(fileURLToPath(import.meta.url))
const entry = join(__dirname, "..", "src", "index.ts")

const child = spawn("npx", ["tsx", entry, ...process.argv.slice(2)], {
  stdio: "inherit",
  shell: true,
})

child.on("exit", (code) => process.exit(code ?? 0))
