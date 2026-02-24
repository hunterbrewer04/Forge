// app/member/layout.tsx
export default function MemberLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-[#1C1C1C] flex flex-col">
      <header className="flex items-center justify-center py-8">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: 'var(--facility-primary)' }}
        >
          <span className="text-white text-xl font-bold font-[--font-lexend]">F</span>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center px-4 pb-12">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  )
}
