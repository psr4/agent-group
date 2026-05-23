import { useState, useEffect, createContext, useContext, useCallback } from "react"

type Toast = { id: string; message: string; type: "error" | "success" | "info" }

const ToastContext = createContext<{ showError: (msg: string) => void; showSuccess: (msg: string) => void }>({
  showError: () => {},
  showSuccess: () => {},
})

export function useToast() {
  return useContext(ToastContext)
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((message: string, type: Toast["type"]) => {
    const id = crypto.randomUUID()
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4000)
  }, [])

  const showError = useCallback((msg: string) => addToast(msg, "error"), [addToast])
  const showSuccess = useCallback((msg: string) => addToast(msg, "success"), [addToast])

  return (
    <ToastContext.Provider value={{ showError, showSuccess }}>
      {children}
      <div style={{ position: "fixed", top: 16, right: 16, zIndex: 9999, display: "flex", flexDirection: "column", gap: 8 }}>
        {toasts.map((toast) => (
          <div
            key={toast.id}
            style={{
              padding: "12px 16px",
              borderRadius: 6,
              background: toast.type === "error" ? "#fee2e2" : toast.type === "success" ? "#d1fae5" : "#e0e7ff",
              border: `1px solid ${toast.type === "error" ? "#fecaca" : toast.type === "success" ? "#a7f3d0" : "#c7d2fe"}`,
              color: toast.type === "error" ? "#dc2626" : toast.type === "success" ? "#059669" : "#4f46e5",
              fontSize: 14,
              boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
              maxWidth: 320,
            }}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
