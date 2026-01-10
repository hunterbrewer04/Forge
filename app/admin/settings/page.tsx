'use client'

import { useRouter } from 'next/navigation'
import MobileLayout from '@/components/layout/MobileLayout'
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
    href: '/admin/settings/calendar',
    color: 'text-primary',
    bgColor: 'bg-primary/20',
  },
]

export default function AdminSettingsPage() {
  const router = useRouter()

  return (
    <MobileLayout title="Settings" showBack showNotifications={false}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-stone-700 rounded-full flex items-center justify-center">
            <Settings size={24} className="text-stone-300" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Admin Settings</h2>
            <p className="text-sm text-stone-400">
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
              className="w-full flex items-center gap-4 p-4 bg-surface-dark rounded-xl hover:bg-stone-800/80 transition-colors text-left"
            >
              <div className={`w-10 h-10 ${item.bgColor} rounded-lg flex items-center justify-center flex-shrink-0`}>
                <item.icon size={20} className={item.color} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-white">{item.title}</p>
                <p className="text-sm text-stone-400 truncate">{item.description}</p>
              </div>
              <ChevronRight size={20} className="text-stone-500 flex-shrink-0" />
            </button>
          ))}
        </div>
      </div>
    </MobileLayout>
  )
}
