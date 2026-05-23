import { parseArgs, printHelp, type CliOptions } from "./cli.js"
import { startServer } from "./server.js"

const args = process.argv.slice(2)

if (args.includes("-h") || args.includes("--help")) {
  printHelp()
  process.exit(0)
}

const options: CliOptions = parseArgs(args)

const port = options.port ?? 3000
const directory = options.directory ?? process.cwd()

startServer({ port, directory })
