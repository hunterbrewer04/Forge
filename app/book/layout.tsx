export default function BookLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950">
      {/* Minimal header — facility branding only */}
      <header className="sticky top-0 z-10 bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
            style={{ backgroundColor: 'var(--facility-primary)' }}
          >
            F
          </div>
          <span className="font-semibold text-stone-900 dark:text-stone-100 text-sm">
            Book a Session
          </span>
        </div>
      </header>

      <main className="max-w-lg mx-auto">{children}</main>
    </div>
  )
}
