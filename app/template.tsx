'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

export default function Template({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const prevPathname = useRef(pathname)

  useEffect(() => {
    if (prevPathname.current !== pathname) {
      // Only trigger view transition if browser supports it
      if (typeof document !== 'undefined' && 'startViewTransition' in document) {
        // The transition is already happening since Next.js has swapped the content
        // We just need to signal the browser to animate
        (document as any).startViewTransition(() => {
          // Content is already updated by Next.js
          return Promise.resolve()
        })
      }
      prevPathname.current = pathname
    }
  }, [pathname])

  return <>{children}</>
}
