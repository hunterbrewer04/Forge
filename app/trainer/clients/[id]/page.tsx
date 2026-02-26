'use client'

import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useClientDetail } from '@/lib/hooks/useClients'
import GlassAppLayout from '@/components/layout/GlassAppLayout'
import GlassCard from '@/components/ui/GlassCard'
import { ClientDetailSkeleton } from '@/components/skeletons/ClientSkeleton'
import Image from 'next/image'
import {
  User,
  Mail,
  Calendar,
  MessageCircle,
  AlertCircle,
} from '@/components/ui/icons'
import { motion } from 'framer-motion'
import { staggerContainer, fadeUpItem } from '@/lib/motion'

export default function ClientDetailPage() {
  const params = useParams()
  const router = useRouter()
  const clientId = params.id as string
  const { user } = useAuth()
  const { client, loading, error } = useClientDetail(user?.id, clientId)

  const formatJoinDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <GlassAppLayout title="Client Profile" desktopTitle="Client Profile" showBack showNotifications={false}>
      {loading ? (
        <ClientDetailSkeleton />
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="bg-error/10 p-4 rounded-full mb-3">
            <AlertCircle size={32} className="text-error" />
          </div>
          <p className="text-text-secondary text-sm text-center">{error}</p>
        </div>
      ) : client ? (
        <motion.div variants={staggerContainer} initial="hidden" animate="show" className="lg:grid lg:grid-cols-3 lg:gap-6 space-y-6 lg:space-y-0">
          {/* Left column: profile header + message button */}
          <motion.div variants={fadeUpItem}>
          <GlassCard variant="subtle" className="p-6">
            {/* Profile Header */}
            <div className="flex flex-col items-center text-center">
              <div className="size-24 rounded-full bg-bg-secondary overflow-hidden mb-3">
                {client.avatar_url ? (
                  <Image
                    src={client.avatar_url}
                    alt={client.full_name || 'Client'}
                    width={96}
                    height={96}
                    className="object-cover size-full"
                  />
                ) : (
                  <div className="size-full flex items-center justify-center">
                    <User size={40} className="text-text-muted" />
                  </div>
                )}
              </div>
              <h2 className="text-xl font-bold text-text-primary">
                {client.full_name || 'Unnamed Client'}
              </h2>
              {client.username && (
                <p className="text-text-secondary text-sm">@{client.username}</p>
              )}
            </div>

            {/* Quick Action: Message */}
            <button
              onClick={() => router.push(`/chat?conversation=${client.conversation_id}`)}
              className="interactive-card mt-6 w-full flex items-center justify-center gap-2 bg-primary text-white py-3 rounded-xl font-semibold hover:bg-primary/90 transition-colors"
            >
              <MessageCircle size={20} />
              Message Client
            </button>
          </GlassCard>
          </motion.div>

          {/* Right column: info cards */}
          <motion.div variants={fadeUpItem} className="lg:col-span-2">
            <GlassCard variant="subtle" className="p-6">
              <div className="space-y-3">
                {client.email && (
                  <div className="bg-bg-card border border-border rounded-xl p-4 flex items-center gap-3">
                    <div className="bg-primary/10 p-2 rounded-lg">
                      <Mail size={20} className="text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-text-muted text-xs font-medium uppercase tracking-wider">Email</p>
                      <p className="text-text-primary text-sm truncate">{client.email}</p>
                    </div>
                  </div>
                )}

                {client.username && (
                  <div className="bg-bg-card border border-border rounded-xl p-4 flex items-center gap-3">
                    <div className="bg-primary/10 p-2 rounded-lg">
                      <User size={20} className="text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-text-muted text-xs font-medium uppercase tracking-wider">Username</p>
                      <p className="text-text-primary text-sm">@{client.username}</p>
                    </div>
                  </div>
                )}

                <div className="bg-bg-card border border-border rounded-xl p-4 flex items-center gap-3">
                  <div className="bg-primary/10 p-2 rounded-lg">
                    <Calendar size={20} className="text-primary" />
                  </div>
                  <div>
                    <p className="text-text-muted text-xs font-medium uppercase tracking-wider">Member Since</p>
                    <p className="text-text-primary text-sm">{formatJoinDate(client.created_at)}</p>
                  </div>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        </motion.div>
      ) : null}
    </GlassAppLayout>
  )
}
