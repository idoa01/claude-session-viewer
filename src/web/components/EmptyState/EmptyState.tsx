import { useRef, useState } from 'react'
import styles from './EmptyState.module.css'

interface Props {
  onFile: (file: File) => void
}

export function EmptyState({ onFile }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    setDragging(true)
  }

  function handleDragLeave() {
    setDragging(false)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) onFile(file)
  }

  function handleClick() {
    inputRef.current?.click()
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) onFile(file)
  }

  return (
    <div className={styles.wrapper}>
      <div
        className={`${styles.zone} ${dragging ? styles.zoneDragging : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <div className={styles.uploadIcon}>📂</div>
        <div className={styles.heading}>Drop a session file to begin</div>
        <div className={styles.subtext}>
          Drag a <code>.jsonl</code> file here, or click to browse
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".jsonl"
          style={{ display: 'none' }}
          onChange={handleChange}
        />
      </div>
    </div>
  )
}
