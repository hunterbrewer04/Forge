'use client'

import { useRef, useState, useCallback, useEffect } from 'react'

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>
  threshold?: number
}

export function usePullToRefresh({
  onRefresh,
  threshold = 80,
}: UsePullToRefreshOptions) {
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isPulling, setIsPulling] = useState(false)

  const containerRef = useRef<HTMLDivElement | null>(null)
  const startYRef = useRef(0)
  const isActiveRef = useRef(false)

  const handleTouchStart = useCallback((e: TouchEvent | React.TouchEvent) => {
    const container = containerRef.current
    if (!container || isRefreshing) return

    // Only activate when scrolled to top
    if (container.scrollTop === 0) {
      startYRef.current = e.touches[0].clientY
      isActiveRef.current = true
    }
  }, [isRefreshing])

  const handleTouchMove = useCallback((e: TouchEvent | React.TouchEvent) => {
    if (!isActiveRef.current || isRefreshing) return

    const container = containerRef.current
    if (!container) return

    const currentY = e.touches[0].clientY
    const delta = currentY - startYRef.current

    // Only pull down from top
    if (delta > 0 && container.scrollTop === 0) {
      // Apply resistance for natural feel
      const resistedDistance = delta * 0.4
      setPullDistance(resistedDistance)
      setIsPulling(true)

      // Prevent default scroll behavior when pulling
      if ('preventDefault' in e) {
        e.preventDefault()
      }
    }
  }, [isRefreshing])

  const handleTouchEnd = useCallback(async () => {
    if (!isActiveRef.current || isRefreshing) return

    isActiveRef.current = false
    setIsPulling(false)

    if (pullDistance >= threshold) {
      // Trigger refresh
      setIsRefreshing(true)
      try {
        await onRefresh()
      } finally {
        setIsRefreshing(false)
        setPullDistance(0)
      }
    } else {
      // Animate back to 0
      setPullDistance(0)
    }
  }, [pullDistance, threshold, onRefresh, isRefreshing])

  // Clean up on unmount
  useEffect(() => {
    return () => {
      isActiveRef.current = false
      setPullDistance(0)
      setIsRefreshing(false)
      setIsPulling(false)
    }
  }, [])

  return {
    pullDistance,
    isRefreshing,
    isPulling,
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
    containerRef,
  }
}
