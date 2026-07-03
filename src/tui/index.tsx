import { render } from 'ink'
import App from './App'
import { parseDirectModeArg, resolveDirectModePath } from './cli/parseArgs'

if (!process.stdout.isTTY) {
  console.error('sesh: requires an interactive terminal (no TTY detected) — try running it directly, not piped or redirected.')
  process.exit(1)
}

const rawPath = parseDirectModeArg(process.argv.slice(2))

if (rawPath === undefined) {
  render(<App />)
} else {
  const resolution = resolveDirectModePath(rawPath, process.cwd())
  if (!resolution.ok) {
    console.error(resolution.message)
    process.exit(1)
  }
  render(<App directModePath={resolution.path} />)
}
