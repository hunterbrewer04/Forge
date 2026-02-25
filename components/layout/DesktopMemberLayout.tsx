'use client'

import Image from 'next/image'

interface DesktopMemberLayoutProps {
  children: React.ReactNode
}

export default function DesktopMemberLayout({ children }: DesktopMemberLayoutProps) {
  return (
    <div className="h-screen overflow-y-auto relative">
      {/* Gradient mesh background */}
      <div className="gradient-mesh" />

      <header className="relative z-10 flex items-center justify-center py-6">
        <Image src="/forge-logo.png" alt="Forge" width={140} height={70} className="h-12 w-auto" priority />
      </header>

      <main className="relative z-10 flex flex-col items-center px-4 pb-12">
        <div className="w-full max-w-5xl">{children}</div>
      </main>
    </div>
  )
}
