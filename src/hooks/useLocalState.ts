import { useEffect, useState, type Dispatch, type SetStateAction } from 'react'

function readStored<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (raw === null) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

/**
 * Like useState, but persists value in localStorage under `key` (JSON round-trip).
 */
export function useLocalState<T>(
  key: string,
  initialValue: T | (() => T),
): [T, Dispatch<SetStateAction<T>>] {
  const [state, setState] = useState<T>(() => {
    const init = typeof initialValue === 'function' ? (initialValue as () => T)() : initialValue
    if (typeof window === 'undefined') return init
    return readStored(key, init)
  })

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state))
    } catch {
      /* quota / private mode */
    }
  }, [key, state])

  return [state, setState]
}
