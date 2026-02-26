'use client'

import { useRouter } from 'next/navigation'
import GlassAppLayout from '@/components/layout/GlassAppLayout'
import GlassCard from '@/components/ui/GlassCard'
import {
  Calendar,
  ChevronRight,
  Settings,
} from '@/components/ui/icons'

const settingsItems = [
  {
    id: 'calendar',
    title: 'Calendar Sync',
    description: 'Sync your sessions with Google Calendar, Apple Calendar, or Outlook',
    icon: Calendar,
    href: '/trainer/settings/calendar',
    color: 'text-primary',
    bgColor: 'bg-primary/20',
  },
]

export default function AdminSettingsPage() {
  const router = useRouter()

  return (
    <GlassAppLayout title="Settings" desktopTitle="Settings" showBack showNotifications={false}>
      <GlassCard variant="subtle" className="p-6" interactive>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-bg-secondary rounded-full flex items-center justify-center">
              <Settings size={24} className="text-text-secondary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-text-primary">Trainer Settings</h2>
              <p className="text-sm text-text-secondary">
                Configure your trainer account
              </p>
            </div>
          </div>

          {/* Settings List */}
          <div className="space-y-2">
            {settingsItems.map((item) => (
              <button
                key={item.id}
                onClick={() => router.push(item.href)}
                className="w-full flex items-center gap-4 p-4 bg-bg-input rounded-xl hover:bg-bg-secondary/80 transition-colors text-left"
              >
                <div className={`w-10 h-10 ${item.bgColor} rounded-lg flex items-center justify-center flex-shrink-0`}>
                  <item.icon size={20} className={item.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-text-primary">{item.title}</p>
                  <p className="text-sm text-text-secondary truncate">{item.description}</p>
                </div>
                <ChevronRight size={20} className="text-text-muted flex-shrink-0" />
              </button>
            ))}
          </div>
        </div>
      </GlassCard>
    </GlassAppLayout>
  )
}
