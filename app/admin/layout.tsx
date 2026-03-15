import { requireRole } from '@/lib/api/require-role'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireRole('isAdmin')

  return (
    <>
      {/* Desktop-only gate: show message on mobile */}
      <div className="lg:hidden flex items-center justify-center min-h-screen px-6">
        <div className="text-center">
          <h2 className="text-xl font-bold text-text-primary mb-2">Desktop Only</h2>
          <p className="text-text-secondary">
            The admin dashboard is optimized for desktop. Please use a larger screen.
          </p>
        </div>
      </div>

      {/* Desktop content */}
      <div className="hidden lg:block">
        {children}
      </div>
    </>
  )
}
