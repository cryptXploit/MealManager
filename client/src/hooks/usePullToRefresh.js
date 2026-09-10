import { useState, useRef, useCallback } from 'react'

function usePullToRefresh(elementRef, onRefresh, threshold = 60) {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const startY = useRef(0)
  const currentY = useRef(0)
  const isPulling = useRef(false)
  const refreshingLock = useRef(false)
  const refreshPromise = useRef(null)

  const setTransform = (y) => {
    currentY.current = y
    if (elementRef?.current) {
      elementRef.current.style.transform = `translateY(${y > 0 ? y * 0.5 : 0}px)`
    }
  }

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
      setTransform(Math.min(diff * 0.4, 150))
    } else {
      setTransform(0)
    }
  }, [elementRef])

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling.current || refreshingLock.current) {
      isPulling.current = false
      setTransform(0)
      return
    }
    isPulling.current = false
    
    if (currentY.current > threshold && !refreshingLock.current) {
      refreshingLock.current = true
      setIsRefreshing(true)
      setTransform(threshold)

      if (refreshPromise.current) return
      refreshPromise.current = onRefresh()
      await refreshPromise.current
      refreshPromise.current = null

      setTimeout(() => {
        setIsRefreshing(false)
        setTransform(0)
        setTimeout(() => {
          refreshingLock.current = false
        }, 300)
      }, 500)
    } else {
      setTransform(0)
    }
  }, [threshold, onRefresh, elementRef])

  return { isRefreshing, handleTouchStart, handleTouchMove, handleTouchEnd }
}

export default usePullToRefresh