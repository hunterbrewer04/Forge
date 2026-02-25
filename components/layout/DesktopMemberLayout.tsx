'use client'

interface DesktopMemberLayoutProps {
  children: React.ReactNode
}

export default function DesktopMemberLayout({ children }: DesktopMemberLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col relative">
      {/* Gradient mesh background */}
      <div className="gradient-mesh" />

      <header className="relative z-10 flex items-center justify-center py-8">
        <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
          <span className="text-white text-xl font-bold font-[--font-lexend]">F</span>
        </div>
      </header>

      <main className="relative z-10 flex-1 flex flex-col items-center px-4 pb-12">
        <div className="w-full max-w-5xl">{children}</div>
      </main>
    </div>
  )
}
