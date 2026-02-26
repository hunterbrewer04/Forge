'use client'

interface DesktopMemberLayoutProps {
  children: React.ReactNode
}

export default function DesktopMemberLayout({ children }: DesktopMemberLayoutProps) {
  return (
    <div className="h-screen overflow-y-auto relative">
      {/* Gradient mesh background */}
      <div className="gradient-mesh" />

      <main className="relative z-10 flex flex-col items-center px-4 pb-12">
        <div className="w-full max-w-5xl">{children}</div>
      </main>
    </div>
  )
}
