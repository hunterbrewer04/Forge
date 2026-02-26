'use client'

import { useMemo, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useClientList } from '@/lib/hooks/useClients'
import GlassAppLayout from '@/components/layout/GlassAppLayout'
import GlassCard from '@/components/ui/GlassCard'
import { ClientListSkeleton } from '@/components/skeletons/ClientSkeleton'
import Link from 'next/link'
import Image from 'next/image'
import {
  Search,
  User,
  ChevronRight,
  Users,
  AlertCircle,
} from '@/components/ui/icons'
import { motion } from 'framer-motion'
import { staggerContainer } from '@/lib/motion'

export default function ClientListPage() {
  const { user } = useAuth()
  const { clients, loading, error } = useClientList(user?.id)
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    if (!search.trim()) return clients
    const q = search.toLowerCase()
    return clients.filter(
      (c) =>
        c.full_name?.toLowerCase().includes(q) ||
        c.username?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q)
    )
  }, [clients, search])

  return (
    <GlassAppLayout title="Clients" desktopTitle="Clients" showBack showNotifications={false}>
      {/* Search */}
      <GlassCard variant="subtle" className="p-4">
        <div className="relative">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
          />
          <input
            type="text"
            placeholder="Search by name, username, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-bg-secondary text-text-primary rounded-xl pl-10 pr-4 py-3 text-sm border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none placeholder:text-text-muted"
          />
        </div>
      </GlassCard>

      {/* Content */}
      {loading ? (
        <ClientListSkeleton />
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="bg-error/10 p-4 rounded-full mb-3">
            <AlertCircle size={32} className="text-error" />
          </div>
          <p className="text-text-secondary text-sm text-center">{error}</p>
        </div>
      ) : clients.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="bg-bg-secondary p-4 rounded-full mb-3">
            <Users size={32} className="text-text-muted" />
          </div>
          <h3 className="text-text-primary font-medium mb-1">No Clients Yet</h3>
          <p className="text-text-secondary text-sm">
            Clients will appear here once they have a conversation with you
          </p>
        </div>
      ) : (
        <>
          <p className="text-text-muted text-xs font-medium uppercase tracking-wider">
            {filtered.length} {filtered.length === 1 ? 'client' : 'clients'}
          </p>

          <motion.div variants={staggerContainer} initial="hidden" animate="show" className="lg:grid lg:grid-cols-2 xl:grid-cols-3 lg:gap-3 space-y-1 lg:space-y-0">
            {filtered.map((client) => (
              <Link
                key={client.id}
                href={`/trainer/clients/${client.id}`}
                className="interactive-card flex items-center gap-3 p-3 rounded-xl transition-all hover:bg-bg-secondary"
              >
                {/* Avatar */}
                <div className="size-12 rounded-full bg-bg-secondary overflow-hidden shrink-0">
                  {client.avatar_url ? (
                    <Image
                      src={client.avatar_url}
                      alt={client.full_name || 'Client'}
                      width={48}
                      height={48}
                      className="object-cover size-full"
                    />
                  ) : (
                    <div className="size-full flex items-center justify-center">
                      <User size={24} className="text-text-muted" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-text-primary truncate">
                    {client.full_name || 'Unnamed Client'}
                  </h4>
                  <p className="text-text-secondary text-sm truncate">
                    {client.username ? `@${client.username}` : client.email || 'No contact info'}
                  </p>
                </div>

                <ChevronRight size={18} className="text-text-muted shrink-0" />
              </Link>
            ))}

            {filtered.length === 0 && search && (
              <div className="py-8 text-center">
                <p className="text-text-secondary text-sm">
                  No clients matching &quot;{search}&quot;
                </p>
              </div>
            )}
          </motion.div>
        </>
      )}
    </GlassAppLayout>
  )
}
