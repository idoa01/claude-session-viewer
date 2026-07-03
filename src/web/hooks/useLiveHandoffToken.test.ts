import { describe, it, expect, afterEach, vi } from 'vitest'
import { readAndClearLiveHandoffToken } from './useLiveHandoffToken'

function stubLocation(hash: string, pathname = '/', search = '') {
  const replaceState = vi.fn()
  vi.stubGlobal('location', { hash, pathname, search } as unknown as Location)
  vi.stubGlobal('history', { replaceState } as unknown as History)
  return { replaceState }
}

describe('readAndClearLiveHandoffToken', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns undefined when there is no token fragment', () => {
    stubLocation('')
    expect(readAndClearLiveHandoffToken()).toBeUndefined()
  })

  it('extracts and URL-decodes the token from the fragment', () => {
    stubLocation('#token=abc%2Fdef')
    expect(readAndClearLiveHandoffToken()).toBe('abc/def')
  })

  it('clears the fragment from the visible URL via history.replaceState', () => {
    const { replaceState } = stubLocation('#token=xyz', '/some/path', '?q=1')
    readAndClearLiveHandoffToken()
    expect(replaceState).toHaveBeenCalledWith(null, '', '/some/path?q=1')
  })

  it('ignores an unrelated hash', () => {
    stubLocation('#not-a-token')
    expect(readAndClearLiveHandoffToken()).toBeUndefined()
  })
})
