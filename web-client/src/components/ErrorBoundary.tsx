import { Component, type ReactNode } from "react"

type Props = { children: ReactNode; fallback?: ReactNode }
type State = { hasError: boolean; error?: Error }

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div style={{ padding: 40, textAlign: "center", color: "#dc2626" }}>
          <h2>出错了</h2>
          <p style={{ marginTop: 8, color: "#6b7280" }}>{this.state.error?.message || "未知错误"}</p>
          <button
            onClick={() => window.location.reload()}
            style={{ marginTop: 16, padding: "8px 16px", background: "#0096ff", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer" }}
          >
            刷新页面
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
