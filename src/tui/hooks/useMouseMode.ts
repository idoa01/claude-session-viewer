import { useEffect } from 'react'
import { useStdout } from 'ink'
import { ENTER_MOUSE_MODE, EXIT_MOUSE_MODE } from '../mouse/mouseProtocol'

export function useMouseMode() {
  const { stdout } = useStdout()

  useEffect(() => {
    if (!stdout?.isTTY) return

    let restored = false
    const restore = () => {
      if (restored) return
      restored = true
      stdout.write(EXIT_MOUSE_MODE)
    }

    stdout.write(ENTER_MOUSE_MODE)
    process.on('exit', restore)

    return () => {
      process.off('exit', restore)
      restore()
    }
  }, [stdout])
}
