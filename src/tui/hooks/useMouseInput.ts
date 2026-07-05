import { useInput } from 'ink'
import { parseMouseEvent, type ParsedMouseEvent } from '../mouse/mouseProtocol'

interface MouseInputOptions {
  isActive?: boolean
}

export function useMouseInput(
  onMouse: (event: ParsedMouseEvent) => void,
  options: MouseInputOptions = {}
) {
  useInput(input => {
    const event = parseMouseEvent(input)
    if (event) onMouse(event)
  }, options)
}
