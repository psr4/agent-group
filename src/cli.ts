export type CliOptions = {
  port?: number
  directory?: string
}

export function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {}
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === "-p" || arg === "--port") {
      const value = args[++i]
      if (value === undefined) {
        console.error("Error: --port requires a value")
        process.exit(1)
      }
      options.port = parseInt(value, 10)
      if (isNaN(options.port)) {
        console.error("Error: --port must be a number")
        process.exit(1)
      }
    } else if (arg === "-d" || arg === "--directory") {
      const value = args[++i]
      if (value === undefined) {
        console.error("Error: --directory requires a value")
        process.exit(1)
      }
      options.directory = value
    }
  }
  
  return options
}

export function printHelp(): void {
  console.log(`
opencode-web - Agent 群聊 Web 界面

用法:
  opencode-web [选项]

选项:
  -p, --port <port>       监听端口 (默认: 3000)
  -d, --directory <path>  项目目录 (默认: 当前目录)
  -h, --help              显示帮助

示例:
  opencode-web
  opencode-web --port 8080
  opencode-web --directory ./my-project
`)
}
