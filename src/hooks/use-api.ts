import { useState, useEffect, startTransition, useCallback } from 'react'
import { api } from '@/lib/api-client'

export function useApi<T>(
  endpoint: string,
  autoFetch: boolean = true
) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const result = await api.get<T>(endpoint)
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [endpoint])

  useEffect(() => {
    if (autoFetch) {
      startTransition(() => {
        fetchData()
      })
    }
  }, [autoFetch, fetchData])

  return {
    data,
    loading,
    error,
    refetch: fetchData
  }
}
