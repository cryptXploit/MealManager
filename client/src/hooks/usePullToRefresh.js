import { useState, useRef, useCallback } from 'react'

function usePullToRefresh(onRefresh, threshold = 60) {
  const [pullY, setPullY] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const startY = useRef(0)
  const isPulling = useRef(false)
  const refreshingLock = useRef(false)
  const refreshPromise = useRef(null)

  const handleTouchStart = useCallback((e) => {
    if (refreshingLock.current) return
    if (e.currentTarget.scrollTop === 0) {
      startY.current = e.touches[0].clientY
      isPulling.current = true
    } else {
      isPulling.current = false
    }
  }, [])

  const handleTouchMove = useCallback((e) => {
    if (!isPulling.current || refreshingLock.current) return
    const diff = e.touches[0].clientY - startY.current
    if (diff > 0 && e.currentTarget.scrollTop <= 0) {
      e.preventDefault()
      setPullY(Math.min(diff * 0.4, 150))
    } else {
      setPullY(0)
    }
  }, [])

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling.current || refreshingLock.current) {
      isPulling.current = false
      setPullY(0)
      return
    }
    isPulling.current = false
    if (pullY > threshold && !refreshingLock.current) {
      refreshingLock.current = true
      setIsRefreshing(true)
      setPullY(threshold)

      if (refreshPromise.current) return
      refreshPromise.current = onRefresh()
      await refreshPromise.current
      refreshPromise.current = null

      setTimeout(() => {
        setIsRefreshing(false)
        setPullY(0)
        setTimeout(() => {
          refreshingLock.current = false
        }, 300)
      }, 500)
    } else {
      setPullY(0)
    }
  }, [pullY, threshold, onRefresh])

  return { pullY, isRefreshing, handleTouchStart, handleTouchMove, handleTouchEnd }
}

export default usePullToRefresh