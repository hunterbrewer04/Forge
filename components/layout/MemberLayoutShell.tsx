'use client'

import Image from 'next/image'
import { useIsDesktop } from '@/lib/hooks/useIsDesktop'
import DesktopMemberLayout from './DesktopMemberLayout'

interface MemberLayoutShellProps {
  children: React.ReactNode
}

export default function MemberLayoutShell({ children }: MemberLayoutShellProps) {
  const isDesktop = useIsDesktop()

  if (isDesktop) {
    return <DesktopMemberLayout>{children}</DesktopMemberLayout>
  }

  return (
    <div
      className="min-h-screen bg-bg-secondary flex flex-col"
      style={{
        background: `radial-gradient(ellipse at 50% 0%, color-mix(in srgb, var(--facility-primary) 6%, transparent) 0%, transparent 70%)`,
        backgroundColor: 'var(--bg-secondary)',
      }}
    >
      <header className="flex items-center justify-center py-6">
        <Image src="/forge-logo.png" alt="Forge" width={140} height={70} className="h-12 w-auto" priority />
      </header>

      <main className="flex-1 flex flex-col items-center px-4 pb-12">
        <div className="w-full max-w-md md:max-w-2xl lg:max-w-4xl">{children}</div>
      </main>
    </div>
  )
}
