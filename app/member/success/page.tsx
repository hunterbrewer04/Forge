'use client'

import Link from 'next/link'
import { CheckCircle } from '@/components/ui/icons'

export default function MemberSuccessPage() {
  return (
    <div className="space-y-8 text-center">
      <div className="flex justify-center">
        <CheckCircle className="w-16 h-16 text-green-500" />
      </div>

      <div>
        <h1 className="text-3xl font-bold text-white font-[--font-lexend]">
          You&apos;re all set!
        </h1>
        <p className="mt-3 text-stone-400 text-sm leading-relaxed">
          Your membership is active. Browse the session calendar and book
          your first lesson below.
        </p>
      </div>

      <Link
        href="/schedule"
        className="flex w-full justify-center rounded-xl py-3 px-4 text-sm font-semibold text-white"
        style={{ backgroundColor: 'var(--facility-primary)' }}
      >
        Browse Sessions
      </Link>

      <p className="text-stone-500 text-xs">
        Manage your membership at any time from your{' '}
        <Link href="/member/portal" className="underline text-stone-400">
          billing portal
        </Link>
        .
      </p>
    </div>
  )
}
