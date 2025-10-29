'use client'

import { useEffect, useRef } from 'react'

interface UseInfiniteScrollProps {
  mounted: boolean
  loading: boolean
  loadingMore: boolean
  hasMore: boolean
  onLoadMore: () => void
}

export const useInfiniteScroll = ({
  mounted,
  loading,
  loadingMore,
  hasMore,
  onLoadMore
}: UseInfiniteScrollProps) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Infinite scroll effect
  useEffect(() => {
    if (!mounted || loading || loadingMore || !hasMore) return

    const container = scrollContainerRef.current
    if (!container) return

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container
      if (scrollHeight - scrollTop <= clientHeight * 1.5) {
        onLoadMore()
      }
    }

    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [mounted, loading, loadingMore, hasMore, onLoadMore])

  return {
    scrollContainerRef
  }
}
