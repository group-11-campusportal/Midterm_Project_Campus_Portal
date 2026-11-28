import { useCallback, useEffect, useRef, useState } from 'react'

// Loads a list once, supports pull-to-refresh and retry, and ignores answers after unmount.
// Only the newest request may update the list: on a fast double refresh an older, slower
// answer is dropped instead of overwriting newer data.
export function useApiList(fetcher) {
  const [items, setItems] = useState(null)
  const [error, setError] = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  const mounted = useRef(true)
  const latest = useRef(0)

  const apply = useCallback((promise) => {
    const id = ++latest.current
    const isCurrent = () => mounted.current && id === latest.current
    return promise
      .then((data) => {
        if (!isCurrent()) return
        setItems(data)
        setError(null)
      })
      .catch((err) => {
        // A 401 is handled globally (back to login); show everything else.
        if (isCurrent() && err.status !== 401) setError(err.message)
      })
      .finally(() => {
        if (isCurrent()) setRefreshing(false)
      })
  }, [])

  useEffect(() => {
    mounted.current = true
    apply(fetcher())
    return () => { mounted.current = false }
  }, [fetcher, apply])

  const reload = useCallback(() => {
    setError(null)
    return apply(fetcher())
  }, [fetcher, apply])

  const refresh = useCallback(() => {
    setRefreshing(true)
    return apply(fetcher())
  }, [fetcher, apply])

  return { items, error, refreshing, reload, refresh }
}
