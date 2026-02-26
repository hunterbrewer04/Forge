'use client'

interface DesktopMemberLayoutProps {
  children: React.ReactNode
}

export default function DesktopMemberLayout({ children }: DesktopMemberLayoutProps) {
  return (
    <div className="h-screen overflow-y-auto relative">
      {/* Gradient mesh background */}
      <div className="gradient-mesh" />

      <main className="relative z-10 min-h-full flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-5xl">{children}</div>
      </main>
    </div>
  )
}
