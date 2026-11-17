import { useCallback, useEffect, useRef, useState } from 'react'

// Loads a list once, supports pull-to-refresh and retry, and ignores answers after unmount.
export function useApiList(fetcher) {
  const [items, setItems] = useState(null)
  const [error, setError] = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  const mounted = useRef(true)

  const apply = useCallback((promise) => promise
    .then((data) => {
      if (!mounted.current) return
      setItems(data)
      setError(null)
    })
    .catch((err) => {
      // A 401 is handled globally (back to login); show everything else.
      if (mounted.current && err.status !== 401) setError(err.message)
    })
    .finally(() => {
      if (mounted.current) setRefreshing(false)
    }), [])

  useEffect(() => {
    mounted.current = true
    apply(fetcher())
    return () => { mounted.current = false }
  }, [fetcher, apply])

  const reload = useCallback(() => {
    setError(null)
    apply(fetcher())
  }, [fetcher, apply])

  const refresh = useCallback(() => {
    setRefreshing(true)
    apply(fetcher())
  }, [fetcher, apply])

  return { items, error, refreshing, reload, refresh }
}
