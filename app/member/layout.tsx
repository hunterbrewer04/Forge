// app/member/layout.tsx
export default function MemberLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div
      className="min-h-screen bg-bg-secondary flex flex-col"
      style={{
        background: `radial-gradient(ellipse at 50% 0%, color-mix(in srgb, var(--facility-primary) 6%, transparent) 0%, transparent 70%)`,
        backgroundColor: 'var(--bg-secondary)',
      }}
    >
      <header className="flex items-center justify-center py-8">
        <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
          <span className="text-white text-xl font-bold font-[--font-lexend]">F</span>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center px-4 pb-12">
        <div className="w-full max-w-md md:max-w-2xl lg:max-w-4xl">{children}</div>
      </main>
    </div>
  )
}
