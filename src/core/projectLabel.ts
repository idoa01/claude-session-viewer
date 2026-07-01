// Falls back to the hyphen-split heuristic only when no cwd was found during
// discovery — cwd is unambiguous, the encoded directory name is not (a project
// path containing hyphens collides with the `-`-joined directory name).
export function deriveProjectLabel(dirName: string, cwd?: string): string {
  if (cwd) {
    const parts = cwd.split('/').filter(Boolean)
    return parts.slice(-2).join('/')
  }
  const parts = dirName.split('-').filter(Boolean)
  return parts.slice(-2).join('/')
}
