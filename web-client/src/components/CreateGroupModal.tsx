import { useState } from "react"

type Props = {
  onClose: () => void
  onCreate: (name: string, projectPath: string) => void
}

export default function CreateGroupModal({ onClose, onCreate }: Props) {
  const [name, setName] = useState("")
  const [projectPath, setProjectPath] = useState("")

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>新建群</h2>
        <input type="text" placeholder="群名称" value={name} onChange={(e) => setName(e.target.value)} />
        <input type="text" placeholder="项目路径 (留空使用当前目录)" value={projectPath} onChange={(e) => setProjectPath(e.target.value)} />
        <div className="modal-buttons">
          <button onClick={onClose}>取消</button>
          <button onClick={() => name && onCreate(name, projectPath || ".")}>创建</button>
        </div>
      </div>
    </div>
  )
}
