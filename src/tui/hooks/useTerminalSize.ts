import { useEffect, useState } from 'react'
import { useStdout } from 'ink'

export interface TerminalSize {
  columns: number
  rows: number
}

const FALLBACK: TerminalSize = { columns: 80, rows: 24 }

function readSize(stdout: NodeJS.WriteStream | undefined): TerminalSize {
  return {
    columns: stdout?.columns || FALLBACK.columns,
    rows: stdout?.rows || FALLBACK.rows,
  }
}

// Ink's useStdout doesn't re-render on resize by itself — the stream only
// emits a 'resize' event, so we subscribe here and force a re-render.
export function useTerminalSize(): TerminalSize {
  const { stdout } = useStdout()
  const [size, setSize] = useState<TerminalSize>(() => readSize(stdout))

  useEffect(() => {
    if (!stdout) return
    const onResize = () => setSize(readSize(stdout))
    stdout.on('resize', onResize)
    return () => {
      stdout.off('resize', onResize)
    }
  }, [stdout])

  return size
}
